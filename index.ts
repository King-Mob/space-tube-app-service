import "dotenv/config";
import express from "express";
import { AppService, AppserviceHttpError } from "matrix-appservice";
import { v4 as uuidv4 } from "uuid";
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
  createRoomsAndTube,
  createGroupUser
} from "./matrix/handler.js";
import commands from "./matrix/commands.js";
import { getItem, getItemIncludes, getAllItems, storeItem } from "./matrix/storage.js";
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
  res.send({ message: "yo how's it going on 8133!" });
});

as.listen(8133, "localhost", 99999);

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

    const {
      content: { user },
    } = await getItem("userRoomId", matrixRoomId, "spacetube.user");

    const cloneEvents = await getAllItems("cloneRoomId", matrixRoomId, "spacetube.user.clone");
    console.log(cloneEvents)
    const cloneIds = cloneEvents.map(event => {
      console.log(event);
      return "dave"
    })

    res.send({
      success: true,
      tubeUserIds: [user.user_id, ...cloneIds]
    });
  } else {
    res.send({
      success: false,
      message: "No room active with that link token",
    });
  }
})

app.get("/api/invite", async (req, res) => {
  const { inviteId } = req.query;

  const invitation = await getItem("inviteId", inviteId);

  if (invitation) res.send({ success: true, invitation });
  else res.send({ success: false, message: "No invite with that id found." });
});

app.post("/api/invite/create", async (req, res) => {
  const { myMatrixId, groupName, contactMatrixId } = req.body;

  const inviteId = uuidv4();

  storeItem({
    type: "spacetube.create.invite",
    from: {
      userId: myMatrixId,
      groupName,
    },
    to: {
      userId: contactMatrixId,
    },
    inviteId,
  });

  const { URL } = process.env;

  res.send({
    success: true,
    link: `${URL}/?invite=${inviteId}`,
  });
});

app.post("/api/invite/accept", async (req, res) => {
  const { myMatrixId, groupName, invite } = req.body;

  const invitation = await getItem("inviteId", invite);

  if (invitation) {
    invitation.content.to.userId = myMatrixId;
    invitation.content.to.groupName = groupName;
    const { toRoom } = await createRoomsAndTube(invitation);
    const { linkToken } = await commands.link(toRoom.room_id, myMatrixId);
    res.send({ success: true, invitation, linkToken });
  } else res.send({ success: false, message: "No invite with that id found." });
});

app.post("/api/groupuser/create", async (req, res) => {
  const { groupName } = req.body;

  const groupUser = await createGroupUser(groupName)

  res.send({
    success: true,
    groupId: groupUser.user_id
  });
});

if (process.env.DISCORD_TOKEN) {
  startDiscord(app);
}
if (process.env.WHATSAPP_USER_ID) {
  startWhatsapp();
}

app.listen(8134);
