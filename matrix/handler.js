import {
  storeItem,
  getItem,
  getAllItems,
  storeItemShared,
  getDisplayName,
} from "../storage.js";
import {
  sendMessage,
  sendMessageAsUser,
  createRoom,
  getRoomState,
  registerUser,
  setDisplayName,
  invite,
  join,
  joinAsSpaceTube,
  getRoomsList,
} from "./matrixClientRequests.js";
import commands from "./commands.js";
import { v4 as uuidv4 } from "uuid";
import { sendMessageDiscord } from "../discord/index.js";
import { sendMessageWhatsapp } from "../whatsapp/index.js";

const { HOME_SERVER } = process.env;

export const getRoomName = async (roomId) => {
  const roomStateResponse = await getRoomState(roomId);
  const roomState = await roomStateResponse.json();

  let roomName = "default";

  for (const roomEvent of roomState) {
    if (roomEvent.type === "m.room.name")
      roomName = roomEvent.content.name;
  }

  return roomName;
}

export const createGroupUser = async (name) => {
  const newUserResponse = await registerUser(name);
  const user = await newUserResponse.json();

  storeItem({
    type: "spacetube.group.user",
    userId: user.user_id,
    user,
    name: name
  })

  setDisplayName(user, name);

  return user;
}

export const creatGroupCloneUser = async (name, groupUserId, roomId) => {
  const newUserResponse = await registerUser(name);
  const user = await newUserResponse.json();

  storeItem({
    type: "spacetube.group.clone",
    originalUserId: groupUserId,
    userId: user.user_id,
    user,
    name: name,
    roomId
  })

  setDisplayName(user, name);

  return user;
}

const createTubeUser = async (name, roomId, tubeIntermediary) => {
  console.log("creating tube user");
  console.log(name, roomId, tubeIntermediary);

  const newUserResponse = await registerUser(name);
  const user = await newUserResponse.json();

  storeItem({
    type: "spacetube.user",
    userId: user.user_id,
    user,
    userRoomId: roomId,
    name: name,
  });

  setDisplayName(user, name);

  await invite(user, tubeIntermediary);
  await join(user, tubeIntermediary);
  await invite(user, roomId);
  await join(user, roomId);

  console.log("it is done");

  return user;
};

const createClone = async (name, roomId, originalUserId) => {
  const newCloneUserResponse = await registerUser(name);
  const newCloneUser = await newCloneUserResponse.json();

  newCloneUser.roomId = roomId;

  storeItem({
    type: "spacetube.user.clone",
    clone: newCloneUser,
    originalUserId,
    cloneRoomId: roomId
  });

  setDisplayName(newCloneUser, name);

  await invite(newCloneUser, roomId);
  await join(newCloneUser, roomId);

  return newCloneUser;
};

export const registerTube = async (roomId) => {
  const tubeOpening = await getItem("name", `registration-${roomId}`);

  const tubeCode = tubeOpening
    ? tubeOpening.content.tubeCode
    : `${uuidv4()}~@space-tube-bot:${HOME_SERVER}`;

  if (!tubeOpening) {
    storeItem({
      name: `registration-${roomId}`,
      type: "spacetube.create",
      tubeCode,
      roomId: roomId,
    }).catch((err) => console.log(err));
  }

  return tubeCode;
};

export const connectSameInstance = async (event, connectionCode) => {
  const otherTube = await getItem("tubeCode", connectionCode);

  if (!otherTube) {
    sendMessage(event.room_id, "That code isn't recognised.");
    return;
  }

  const otherRoomId = otherTube.content.roomId;

  if (otherRoomId === event.room_id) {
    sendMessage(
      event.room_id,
      "That's the creation code for this space, that you would share with another group."
    );
    return;
  }

  await registerTube(event.room_id);

  connectRooms(event.room_id, otherRoomId);
};

const connectRooms = async (roomId1, roomId2) => {
  console.log("connecting rooms");

  const connectedRooms = [roomId1, roomId2].sort();
  const tubeName = `open-${connectedRooms[0]}-${connectedRooms[1]}`;

  const existingTube = await getItem("name", tubeName);

  if (existingTube) {
    sendMessage(roomId1, "This tube is already active.");

    return existingTube;
  } else {
    const tubeRoomResponse = await createRoom();
    const tubeRoom = await tubeRoomResponse.json();
    storeItem({
      name: tubeName,
      type: "spacetube.open",
      tubeIntermediary: tubeRoom.room_id,
      connectedRooms,
    });
    sendMessage(roomId1, "I declare this tube is now open!");
    sendMessage(roomId2, "I declare this tube is now open!");

    return tubeRoom.room_id;
  }
};

export const connectOtherInstance = async (
  event,
  remoteConnectionCode,
  otherInstance
) => {
  console.log("connecting to other instance");

  const sharedTubeManagementItem = await getItem(
    "sharedWithInstance",
    otherInstance
  );

  let sharedTubeManagementRoom;

  if (sharedTubeManagementItem) {
    console.log("shared room exists");
    sharedTubeManagementRoom = sharedTubeManagementItem.content.roomId;
  } else {
    console.log("creating shared room");
    const createRoomResponse = await createRoom();
    const createdRoom = await createRoomResponse.json();
    sharedTubeManagementRoom = createdRoom.room_id;

    await invite({ user_id: otherInstance }, sharedTubeManagementRoom);
    await storeItem({
      type: "spacetube.shared.management",
      sharedWithInstance: otherInstance,
      roomId: sharedTubeManagementRoom,
    });
  }

  const localConnectionCode = await registerTube(event.room_id);

  const connectionCodes = [localConnectionCode, remoteConnectionCode].sort();
  const tubeName = `open-${connectionCodes[0]}~${connectionCodes[1]}`;

  const existingTube = await getItem("name", tubeName);

  if (existingTube) {
    sendMessage(event.room_id, "This tube is already active.");
  } else {
    const createRoomResponse = await createRoom();
    const createdRoom = await createRoomResponse.json();

    await invite({ user_id: otherInstance }, createdRoom.room_id);

    storeItem({
      name: tubeName,
      type: "spacetube.open",
      tubeIntermediary: createdRoom.room_id,
      connectedRooms: [event.room_id],
    });
    storeItemShared(sharedTubeManagementRoom, {
      name: tubeName,
      type: "spacetube.remote.open",
      tubeIntermediary: createdRoom.room_id,
      connectionCode: remoteConnectionCode,
    });

    sendMessage(event.room_id, "I declare this tube open!");
  }
};

// on receipt of tubeOpen in shared management room, store tubeOpen in own room.
export const handleRemoteOpen = async (event) => {
  if (event.sender !== `@space-tube-bot:${HOME_SERVER}`) {
    const { connectionCode } = event.content;

    const tubeOpening = await getItem("tubeCode", connectionCode);

    const localTubeOpening = tubeOpening.content.roomId;

    storeItem({
      name: event.content.name,
      type: "spacetube.open",
      tubeIntermediary: event.content.tubeIntermediary,
      connectedRooms: [localTubeOpening],
    });

    sendMessage(localTubeOpening, "I declare this tube open!");
  }
};

const handleMessageLocalTube = async (tubeIntermediary, event, message) => {
  const {
    content: { userRoomId, name },
  } = await getItem("userId", event.sender);

  const clones = await getAllItems("originalUserId", event.sender);

  let cloneUser;

  if (clones) {
    clones.forEach((clone) => {
      if (
        tubeIntermediary.content.connectedRooms.includes(
          clone.content.clone.roomId
        )
      )
        cloneUser = clone.content.clone;
    });
  }
  if (!cloneUser) {
    const cloneUserRoomId = tubeIntermediary.content.connectedRooms.find(
      (roomId) => roomId !== userRoomId
    );

    cloneUser = await createClone(name, cloneUserRoomId, event.sender);
  }

  sendMessageAsUser(cloneUser, cloneUser.roomId, message);
};

const handleMessageRemoteTube = async (tubeIntermediary, event, message) => {
  console.log("message from remote tube");

  const storedUser = await getItem("userId", event.sender);

  if (!storedUser) {
    const clone = await getItem("originalUserId", event.sender);

    let cloneUser;

    if (clone) {
      cloneUser = clone.content.clone;
    } else {
      const name = await getDisplayName(event.room_id, event.sender);
      const cloneUserRoomId = tubeIntermediary.content.connectedRooms[0];

      cloneUser = await createClone(name, cloneUserRoomId, event.sender);
    }

    sendMessageAsUser(cloneUser, cloneUser.roomId, message);
  }
};

export const forwardToTubeIntermediary = async (tubeIntermediary, event) => {
  console.log("passing message to tube intermediary");

  let user;

  const message = event.content.body;

  const tubeUser = await getItem("userRoomId", event.room_id, "spacetube.user");

  if (tubeUser) {
    user = tubeUser.content.user;

    const roomsList = await getRoomsList(user);
    if (!roomsList.joined_rooms.includes(tubeIntermediary)) {
      await invite(user, tubeIntermediary);
      await join(user, tubeIntermediary);
    }
  } else {
    const newTubeUserName = await getRoomName(event.room_id);

    user = await createTubeUser(
      newTubeUserName,
      event.room_id,
      tubeIntermediary
    );
  }

  sendMessageAsUser(user, tubeIntermediary, message);

  return user;
};

const handleBridgeMessage = async (event, bridgeRoomEvent) => {
  const bridgeUserEvent = await getItem("bridgeUserRoomId", event.room_id);
  const bridgeUser = bridgeUserEvent.content;

  if (event.sender !== bridgeUser.userId) {
    if (bridgeRoomEvent.content.service === "discord") {
      sendMessageDiscord(event, bridgeRoomEvent.content);
    }
    if (bridgeRoomEvent.content.service === "whatsapp") {
      sendMessageWhatsapp(event, bridgeRoomEvent.content);
    }
  }
}

const handleTubeIntermediaryMessage = async (tubeIntermediary, event) => {
  console.log("message in tube intermediary");

  const tubeName = tubeIntermediary.content.name;
  const message = event.content.body;

  //later when we use connection codes throughout, test if the instances are the same
  if (tubeName.includes("~")) {
    handleMessageRemoteTube(tubeIntermediary, event, message);
    return;
  } else {
    handleMessageLocalTube(tubeIntermediary, event, message);
    return;
  }
}

export const handleTubeMessage = async (tubesOpen, event) => {
  event.content.body = event.content.body.replace("!spacetube forward ", "");
  const message = event.content.body;

  let user;

  for (const tubeOpen of tubesOpen) {
    console.log("there was a message in an open tube");

    const bridgeUserEvent = await getItem("bridgeUserRoomId", event.room_id);

    //if (event.sender.includes("@_space-tube") && !bridgeUserEvent) return;

    if (bridgeUserEvent && event.sender !== bridgeUserEvent.content.userId) {
      return;
    }

    user = await forwardToTubeIntermediary(
      tubeOpen.content.tubeIntermediary,
      event
    );
  }

  sendMessageAsUser(user, event.room_id, message);
}

const handleFormat = async (event) => {
  console.log(event);

  const { formattedBody } = event.content;

  const userId = formattedBody.split("href=")[1].split("\"")[1].split("/")[4];

  const user = await getItem("userId", userId);

  const originalUser = await getItem("originalUserId", user.content.originalUserId);




}

export const handleMessage = async (event) => {
  const bridgeRoomEvent = await getItem("bridgeRoomId", event.room_id);
  if (bridgeRoomEvent) {
    handleBridgeMessage(event, bridgeRoomEvent);
  }

  if (event.content.formattedBody) {
    handleFormat(event);
  }

  if (event.sender === `@space-tube-bot:${HOME_SERVER}`) return;

  if (event.sender === `@spacetube-whatsapp:${HOME_SERVER}`) return;

  const message = event.content.body;

  if (message.includes("!spacetube echo")) {
    commands.echo(event)
    return;
  }

  if (message.includes("!spacetube create")) {
    commands.create(event);
    return;
  }

  if (message.includes("!spacetube connect")) {
    commands.connect(event);
    return;
  }

  if (message.includes("!spacetube link")) {
    commands.link(event.room_id, event.sender);
    return;
  }

  if (message.includes("!spacetube forward")) {
    console.log("forwarding message");
    commands.forward(event);
    return;
  }

  const tubeIntermediary = await getItem("tubeIntermediary", event.room_id);

  if (tubeIntermediary) {
    handleTubeIntermediaryMessage(tubeIntermediary, event);
    return;
  }
};

export const handleInvite = async (event) => {
  if (event.content.membership === "invite") {
    const invitedUserId = event.state_key;
    const invitedUser = await getItem("userId", invitedUserId);

    if (invitedUser) {
      await join(invitedUser.content.user, event.room_id);

      console.log("invited user", invitedUser)

      if (invitedUser.type === "spacetube.group.user") {
        const roomInviteUser = await creatGroupCloneUser(invitedUser.content.name, invitedUserId, event.room_id);
        const joinMesage = `Welcome to spacetube! Ask other groups to invite ${roomInviteUser.user_id} to their rooms to connect them with this room.`
        sendMessage(event.room_id, joinMesage);
      }

      return;
    }

    await joinAsSpaceTube(event.room_id);

    if (
      event.sender.includes("@space-tube-bot") &&
      event.sender !== `@space-tube-bot:${HOME_SERVER}`
    ) {
      console.log(event);

      const sharedTubeManagementItem = await getItem(
        "sharedWithInstance",
        event.sender
      );

      if (sharedTubeManagementItem) {
        console.log("already have shared tube management room, not storing");
      } else {
        await storeItem({
          type: "spacetube.shared.management",
          sharedWithInstance: event.sender,
          roomId: event.room_id,
        });
      }
    }
  }
};

export const createRoomsAndTube = async (invitation) => {
  const {
    content: { from, to },
  } = invitation;

  const createFromRoomResponse = await createRoom(`to-${to.groupName}`);
  const fromRoom = await createFromRoomResponse.json();
  invite({ user_id: from.userId }, fromRoom.room_id);

  const createToRoomResponse = await createRoom(`to-${from.groupName}`);
  const toRoom = await createToRoomResponse.json();
  invite({ user_id: to.userId }, toRoom.room_id);

  const tubeIntermediary = await connectRooms(fromRoom.room_id, toRoom.room_id);

  createTubeUser(from.groupName, fromRoom.room_id, tubeIntermediary);
  createTubeUser(to.groupName, toRoom.room_id, tubeIntermediary);

  return { toRoom };
};
