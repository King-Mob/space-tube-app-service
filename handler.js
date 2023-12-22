import fetch from "node-fetch";
import {
  storeItem,
  getItem,
  getItemIncludes,
  getItemShared,
  storeItemShared,
  getDisplayName,
} from "./storage.js";
import { v4 as uuidv4 } from "uuid";
import { sendMessageDiscord } from "./discord/index.js";

const { HOME_SERVER, APPLICATION_TOKEN } = process.env;

export const sendMessage = (roomId, message) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/send/m.room.message?user_id=@space-tube-bot:${HOME_SERVER}`,
    {
      method: "POST",
      body: JSON.stringify({
        body: message,
        msgtype: "m.text",
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APPLICATION_TOKEN}`,
      },
    }
  );
};

export const sendMessageAsUser = (user, roomId, message) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/send/m.room.message`,
    {
      method: "POST",
      body: JSON.stringify({
        body: message,
        msgtype: "m.text",
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.access_token}`,
      },
    }
  );
};

export const createRoom = (name) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/createRoom?user_id=@space-tube-bot:${HOME_SERVER}`,
    {
      method: "POST",
      body: JSON.stringify({
        name: name ? name : "no-name",
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APPLICATION_TOKEN}`,
      },
    }
  );
};

const getRoomState = (roomId) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/state`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APPLICATION_TOKEN}`,
      },
    }
  );
};

export const registerUser = (userId) => {
  return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/register`, {
    method: "POST",
    body: JSON.stringify({
      type: "m.login.application_service",
      username: `_space-tube-${userId}-${uuidv4()}`,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${APPLICATION_TOKEN}`,
    },
  });
};

export const setDisplayName = (user, displayName) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/profile/${user.user_id}/displayname`,
    {
      method: "PUT",
      body: JSON.stringify({
        displayname: displayName,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.access_token}`,
      },
    }
  );
};

export const invite = (user, roomId) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/invite?user_id=@space-tube-bot:${HOME_SERVER}`,
    {
      method: "POST",
      body: JSON.stringify({
        user_id: user.user_id,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APPLICATION_TOKEN}`,
      },
    }
  );
};

export const join = (user, roomId) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/join/${roomId}`,
    {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.access_token}`,
      },
    }
  );
};

const registerTube = async (roomId) => {
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
}

const connectSameInstance = async (event, connectionCode) => {
  const otherTube = await getItem("tubeCode", connectionCode);

  if (!otherTube) {
    sendMessage(event.room_id, "That code isn't recognised.");
    return;
  }

  const otherRoomId = otherTube.content.roomId;

  if (otherRoomId === event.room_id) {
    sendMessage(event.room_id, "That's the creation code for this space, that you would share with another group.");
    return;
  }

  await registerTube(event.room_id);

  const connectedRooms = [event.room_id, otherRoomId].sort();
  const tubeName = `open-${connectedRooms[0]}-${connectedRooms[1]}`;

  const existingTube = await getItem("name", tubeName);

  if (existingTube) {
    sendMessage(event.room_id, "This tube is already active.");
  } else {
    const tubeRoomResponse = await createRoom();
    const tubeRoom = await tubeRoomResponse.json();
    console.log(tubeRoom);
    storeItem({
      name: tubeName,
      type: "spacetube.open",
      tubeIntermediary: tubeRoom.room_id,
      connectedRooms,
    });
    sendMessage(event.room_id, "I declare this tube is now open!");
    sendMessage(otherRoomId, "I declare this tube is now open!");
  }

  return;
};

const connectOtherInstance = async (
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
    content: { user: user, userRoomId, name },
  } = await getItem("userId", event.sender);

  sendMessageAsUser(user, userRoomId, message);

  const clone = await getItem("originalUserId", event.sender);

  let cloneUser;

  if (clone) {
    cloneUser = clone.content.clone;
  } else {
    const newCloneUserResponse = await registerUser(name);
    const newCloneUser = await newCloneUserResponse.json();

    const cloneUserRoomId = tubeIntermediary.content.connectedRooms.find(
      (roomId) => roomId !== userRoomId
    );

    cloneUser = newCloneUser;
    cloneUser.roomId = cloneUserRoomId;

    storeItem({
      type: "spacetube.user.clone",
      clone: cloneUser,
      originalUserId: user.user_id,
    });

    setDisplayName(cloneUser, name);

    await invite(cloneUser, cloneUser.roomId);
    await join(cloneUser, cloneUser.roomId);
  }

  sendMessageAsUser(cloneUser, cloneUser.roomId, message);
};

const handleMessageRemoteTube = async (tubeIntermediary, event, message) => {
  console.log("message from remote tube");

  const storedUser = await getItem("userId", event.sender);

  if (storedUser) {
    const {
      content: { user: user, userRoomId },
    } = storedUser;
    sendMessageAsUser(user, userRoomId, message);
  } else {
    const clone = await getItem("originalUserId", event.sender);

    let cloneUser;

    if (clone) {
      cloneUser = clone.content.clone;
    } else {
      const cloneName = await getDisplayName(event.room_id, event.sender);
      const newCloneUserResponse = await registerUser(cloneName);
      const newCloneUser = await newCloneUserResponse.json();

      const cloneUserRoomId = tubeIntermediary.content.connectedRooms[0];

      cloneUser = newCloneUser;
      cloneUser.roomId = cloneUserRoomId;

      storeItem({
        type: "spacetube.user.clone",
        clone: cloneUser,
        originalUserId: event.sender,
      });

      setDisplayName(cloneUser, cloneName);

      await invite(cloneUser, cloneUser.roomId);
      await join(cloneUser, cloneUser.roomId);
    }

    sendMessageAsUser(cloneUser, cloneUser.roomId, message);
  }
};

export const handleMessage = async (event) => {
  //Check if the event comes from a bridged room
  const bridgeRoomEvent = await getItem("bridgeRoomId", event.room_id);
  if (bridgeRoomEvent) {
    const bridgeUserEvent = await getItem("bridgeUserRoomId", event.room_id);
    const bridgeUser = bridgeUserEvent.content;

    if (event.sender !== bridgeUser.userId && bridgeRoomEvent.service === 'discord')
      sendMessageDiscord(event, bridgeRoomEvent.content);
  }

  if (event.sender === `@space-tube-bot:${HOME_SERVER}`) return;

  const message = event.content.body;

  if (message.includes("!spacetube echo")) {
    const newMessage = "you said: " + message.split("!spacetube echo")[1];

    sendMessage(event.room_id, newMessage);

    return;
  }

  if (message.includes("!spacetube create")) {

    const tubeCode = await registerTube(event.room_id);

    sendMessage(event.room_id, `The code for this room is ${tubeCode}`);

    return;
  }

  if (message.includes("!spacetube connect")) {
    const connectionCode = message.split("!spacetube connect")[1].trim();
    const spaceTubeInstance = connectionCode.split("~")[1];

    if (spaceTubeInstance === `@space-tube-bot:${HOME_SERVER}`) {
      await connectSameInstance(event, connectionCode);
      return;
    } else {
      await connectOtherInstance(event, connectionCode, spaceTubeInstance);
      return;
    }
  }

  if (message.includes("!spacetube link")) {
    handleLink(event);
    return;
  }

  const tubeIntermediary = await getItem("tubeIntermediary", event.room_id);

  if (tubeIntermediary) {
    console.log("message in tube intermediary");

    const tubeName = tubeIntermediary.content.name;

    //later when we use connection codes throughout, test if the instances are the same
    if (tubeName.includes("~")) {
      handleMessageRemoteTube(tubeIntermediary, event, message);
      return;
    } else {
      handleMessageLocalTube(tubeIntermediary, event, message);
      return;
    }
  }

  const tubeOpen = await getItemIncludes("connectedRooms", event.room_id);

  if (tubeOpen) {
    console.log("there was a message in an open tube");

    const bridgeUserEvent = await getItem("bridgeUserRoomId", event.room_id);

    if (bridgeUserEvent) {
      console.log("message sent through bridge");
      console.log(bridgeUserEvent);
      if (event.sender !== bridgeUserEvent.content.userId) {
        return;
      }
    } else {
      if (event.sender.includes("@_space-tube")) return;
    }

    console.log("passing message to tube intermediary");

    const { tubeIntermediary } = tubeOpen.content;

    const tubeUser = await getItem(
      "userRoomId",
      event.room_id,
      "spacetube.user"
    );
    let user;

    if (tubeUser) {
      user = tubeUser.content.user;
    } else {
      const roomStateResponse = await getRoomState(event.room_id);
      const roomState = await roomStateResponse.json();

      let newTubeUserName = "default";

      for (const roomEvent of roomState) {
        if (roomEvent.type === "m.room.name")
          newTubeUserName = roomEvent.content.name;
      }

      const newUserResponse = await registerUser(newTubeUserName);
      const newUser = await newUserResponse.json();

      user = newUser;

      storeItem({
        type: "spacetube.user",
        userId: newUser.user_id,
        user: newUser,
        userRoomId: event.room_id,
        name: newTubeUserName,
      });

      setDisplayName(newUser, newTubeUserName);

      await invite(newUser, tubeIntermediary);
      await join(newUser, tubeIntermediary);
      await invite(newUser, event.room_id);
      await join(newUser, event.room_id);
    }

    console.log(tubeIntermediary);
    console.log(user);

    sendMessageAsUser(user, tubeIntermediary, message);
  }
};

export const handleInvite = async (event) => {
  if (event.content.membership === "invite") {
    await fetch(
      `https://matrix.${HOME_SERVER}/_matrix/client/v3/join/${event.room_id}?user_id=@space-tube-bot:${HOME_SERVER}`,
      {
        method: "POST",
        body: JSON.stringify({}),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${APPLICATION_TOKEN}`,
        },
      }
    );

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

export const handleLink = async (event) => {
  let linkEvent = await getItem("roomId", event.room_id, "spacetube.link");
  let linkToken;
  if (!linkEvent) {
    const newLinkToken = uuidv4();
    await storeItem({
      type: "spacetube.link",
      linkToken: newLinkToken,
      roomId: event.room_id,
    });
    linkToken = newLinkToken;
  } else {
    linkToken = linkEvent.content.linkToken;
  }

  const name = await getDisplayName(event.room_id, event.sender);

  sendMessage(
    event.room_id,
    `Use this link to view the room: https://spacetube.${HOME_SERVER}/?linkToken=${linkToken}&name=${name}`
  );
};

export const handleEgress = async (event) => {
  console.log("egress event happened")
  const message = event.content.body;
  const tubeOpen = await getItemIncludes("connectedRooms", event.room_id);

  if (tubeOpen) {
    console.log("message forwaded to open tube");

    console.log("passing message to tube intermediary");

    const { tubeIntermediary } = tubeOpen.content;

    const tubeUser = await getItem(
      "userRoomId",
      event.room_id,
      "spacetube.user"
    );
    let user;

    if (tubeUser) {
      user = tubeUser.content.user;
    } else {
      const roomStateResponse = await getRoomState(event.room_id);
      const roomState = await roomStateResponse.json();

      let newTubeUserName = "default";

      for (const roomEvent of roomState) {
        if (roomEvent.type === "m.room.name")
          newTubeUserName = roomEvent.content.name;
      }

      const newUserResponse = await registerUser(newTubeUserName);
      const newUser = await newUserResponse.json();

      user = newUser;

      storeItem({
        type: "spacetube.user",
        userId: newUser.user_id,
        user: newUser,
        userRoomId: event.room_id,
        name: newTubeUserName,
      });

      setDisplayName(newUser, newTubeUserName);

      await invite(newUser, tubeIntermediary);
      await join(newUser, tubeIntermediary);
      await invite(newUser, event.room_id);
      await join(newUser, event.room_id);
    }

    console.log(tubeIntermediary);
    console.log(user);

    sendMessageAsUser(user, tubeIntermediary, message);
  }
}
