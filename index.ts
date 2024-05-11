import "dotenv/config";
import express from "express";
import { AppService, AppserviceHttpError } from "matrix-appservice";
import {
  user
} from "./types.js";
import {
  registerUser,
  invite,
  join,
  setDisplayName,
  sync,
} from "./matrix/matrixClientRequests.js";
import {
  handleMessage,
  handleInvite,
  handleRemoteOpen,
  createGroupUser,
  createInvitationRoom,
  createInvitationReceivedRoom,
  createGroupCloneUser
} from "./matrix/handler.js";
import commands from "./matrix/commands.js";
import { getItem, getItemIncludes, getAllItems, storeItem, getDisplayNameAsUser } from "./matrix/storage.js";
import { startDiscord } from "./discord/index.js";
import { startWhatsapp } from "./whatsapp/index.js";

// listening
const as = new AppService({
  homeserverToken: process.env.HOME_SERVER_TOKEN,
});

as.on("http-log", (event) => {
  console.log("http-log", event);
});

as.on("event", (event) => {
  console.log("event received", event);

  switch (event.type) {
    case "m.room.message":
      handleMessage(event);
      break;
    case "m.room.member":
      handleInvite(event);
      break;
    case "spacetube.remote.open":
      handleRemoteOpen(event);
      break;
    case "spacetube.forward":
      commands.forward(event);
      break;
  }
});

as.on("ephemeral", (event) => {
  console.log(event);
});

// can also do this as a promise
as.onAliasQuery = async function (alias) {
  console.log("RECV %s", alias);
};

//handle ping
const asApp = as.expressApp;
asApp.post("/_matrix/app/v1/ping", (req, res) => {
  console.log(req);
  res.send("yo how's it going on 8133!");
});

console.log("spacetube is listening on 8133")
asApp.listen(8133);

//spacetube service on 8134

const app = express();
app.use(express.json());
app.use(express.static("dist-web"));

app.post("/api/register", async (req, res) => {
  const linkEvent = await getItem(
    "linkToken",
    req.body.linkToken,
    "spacetube.link"
  );
  if (linkEvent) {
    const userRegistration = await registerUser(req.body.userName);
    const user = await userRegistration.json() as user;

    await setDisplayName(user, req.body.userName);
    await invite(user, linkEvent.content.roomId);
    await join(user, linkEvent.content.roomId);

    res.send({
      success: true,
      ...user,
    });
  } else {
    res.send({
      success: false,
      message: "No room active with that link token",
    });
  }
});

app.get("/api/tubeInfo", async (req, res) => {
  const linkEvent = await getItem(
    "linkToken",
    req.query.linkToken,
    "spacetube.link"
  );
  if (linkEvent) {
    const tube = await getItemIncludes(
      "connectedRooms",
      linkEvent.content.roomId
    );
    const { tubeIntermediary } = tube.content;

    const response = await fetch(
      `https://matrix.${process.env.HOME_SERVER}/_matrix/client/v3/rooms/${tubeIntermediary}/messages?limit=1000`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.APPLICATION_TOKEN}`,
        },
      }
    );
    const eventsList = await response.json();

    res.send({
      success: true,
      matrixRoomId: linkEvent.content.roomId,
      tubeRoomEvents: eventsList.chunk,
    });
  } else {
    res.send({
      success: false,
      message: "No room active with that link token",
    });
  }
});

app.get("/api/tubeInfo/sync", async (req, res) => {
  const { linkToken, nextBatch } = req.query;

  const linkEvent = await getItem("linkToken", linkToken, "spacetube.link");

  if (linkEvent) {
    const matrixRoomId = linkEvent.content.roomId;

    //and an if for the user, or change the link part so there's already a user,
    //like how there is one for web created tubes

    const {
      content: { user },
    } = await getItem("userRoomId", matrixRoomId, "spacetube.user");

    const syncData = await sync(user, nextBatch) as object;

    res.send({
      success: true,
      ...syncData,
      matrixRoomId
    });
  } else {
    res.send({
      success: false,
      message: "No room active with that link token",
    });
  }
});

app.get("/api/tubeInfo/userIds", async (req, res) => {
  const { linkToken } = req.query;

  const linkEvent = await getItem("linkToken", linkToken, "spacetube.link");

  if (linkEvent) {
    const matrixRoomId = linkEvent.content.roomId;

    const cloneUsers = await getAllItems("roomId", matrixRoomId, "spacetube.group.clone");
    const cloneIds = cloneUsers.map(cloneUser => cloneUser.content.userId);

    const inviteUser = await getItem("roomId", matrixRoomId, "spacetube.group.invite");

    console.log(inviteUser);

    const groupUser = await getItem("userId", inviteUser.content.originalUserId, "spacetube.group.user");

    console.log(groupUser)

    res.send({
      success: true,
      tubeUserIds: [groupUser.content.user_id, ...cloneIds]
    });
  } else {
    res.send({
      success: false,
      message: "No room active with that link token",
    });
  }
})

app.get("/api/invite", async (req, res) => {
  const { inviteUserId } = req.query;

  console.log(inviteUserId);

  const invitation = await getItem("inviteUserId", inviteUserId);

  console.log(invitation)

  if (invitation) res.send({ success: true, invitation });
  else res.send({ success: false, message: "No invite with that id found." });
});

app.post("/api/invite/create", async (req, res) => {
  const { name, groupUserId, groupName } = req.body;

  const { inviteUser, roomId } = await createInvitationRoom(groupUserId, groupName);
  const { linkToken } = await commands.link(roomId, name);

  storeItem({
    type: "spacetube.create.invite",
    from: {
      name,
      groupUserId,
    },
    inviteUserId: inviteUser.user_id,
  });

  const { URL } = process.env;

  res.send({
    success: true,
    inviteLink: `${URL}/?invite=${inviteUser.user_id}`,
    linkToken
  });
});

app.post("/api/invite/accept", async (req, res) => {
  const { myName, groupName, inviteUserId } = req.body;

  const invitation = await getItem("inviteUserId", inviteUserId);

  if (invitation) {
    const toRoom = await createInvitationReceivedRoom(groupName, invitation.content.inviteUserId);

    const { linkToken } = await commands.link(toRoom.room_id, myName);
    res.send({ success: true, invitation, linkToken });
  }
  else {
    res.send({ success: false, message: "No invite with that id found." });
  }
});

app.post("/api/groupuser", async (req, res) => {
  const { groupName } = req.body;

  const groupUser = await createGroupUser(groupName);

  res.send({
    success: true,
    groupId: groupUser.user_id
  });
});

app.get("/api/groupuser", async (req, res) => {
  const { token } = req.query;

  const groupUser = await getItem("editToken", token, "spacetube.group.user");

  if (groupUser) {
    const inviteUser = await getItem("originalUserId", groupUser.content.user.user_id, "spacetube.group.invite");
    const name = await getDisplayNameAsUser(groupUser.content.user, inviteUser.content.roomId, groupUser.content.user.user_id);

    console.log(groupUser, inviteUser, name);

    res.send({ name });
  }
  else {
    res.send({ success: false, message: "No user with matching edit token" });
  }
})

app.put("/api/groupuser", async (req, res) => {
  const { token } = req.query;
  const { name } = req.body;

  const groupUser = await getItem("editToken", token, "spacetube.group.user");

  if (groupUser) {
    setDisplayName(groupUser.content.user, name);

    const inviteUsers = await getAllItems("originalUserId", groupUser.content.user.user_id, "spacetube.group.invite");

    inviteUsers.forEach(inviteUser => {
      setDisplayName(inviteUser.content.user, `${name} (invite)`);
    })

    const cloneUsers = await getAllItems("originalUserId", groupUser.content.user.user_id, "spacetube.group.clone");

    cloneUsers.forEach(cloneUser => {
      setDisplayName(cloneUser.content.user, name);
    })

    res.send({ success: true });
  }
  else {
    res.send({ success: false, message: "No user with matching edit token" });
  }
})

if (process.env.DISCORD_TOKEN) {
  startDiscord(app);
}
if (process.env.WHATSAPP_USER_ID) {
  startWhatsapp();
}

app.listen(8134);
