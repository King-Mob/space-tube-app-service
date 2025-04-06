import {
  user,
  room,
  event,
  TubeRoomLink
} from "../types.js";
import {
  storeItem,
  getItem,
  getAllItems,
  storeItemShared,
  getDisplayName,
  getItemIncludes,
  removeItem
} from "./storage.js";
import {
  sendMessage,
  sendMessageAsUser,
  createRoom,
  getRoomState,
  registerUser,
  setDisplayName,
  inviteAsSpacetubeRequest,
  inviteAsUserRequest,
  join,
  joinAsSpaceTube,
  leaveRoom,
  getProfile,
  getJoinedRooms
} from "./matrixClientRequests.js";
import commands from "./commands.js";
import { v4 as uuidv4 } from "uuid";
import { sendMessageDiscord } from "../discord/index.js";
import { sendMessageWhatsapp } from "../whatsapp/index.js";
import { handleWhatsapp, handleFormatWhatsapp, joinAsSpacetubeWhatsapp } from "../whatsapp/index.js";
import { getDuckDBConnection } from "../duckdb";

const { HOME_SERVER, WHATSAPP_USER_ID, WHATSAPP_SERVER, WHATSAPP_ACCESS_TOKEN } = process.env;

const inviteAsSpacetube = async (invitee: user, roomId: string) => {
  await inviteAsSpacetubeRequest(invitee, roomId);
  await join(invitee, roomId);
}

export const inviteAsUser = async (inviter: user, invitee: user, roomId) => {
  await inviteAsUserRequest(inviter, invitee, roomId);
  await join(invitee, roomId);
}

export const getRoomNameAsSpacetube = async (roomId: string) => {
  const roomStateResponse = await getRoomState(roomId, null);
  const roomState = await roomStateResponse.json() as event[];

  let roomName = "default";

  for (const roomEvent of roomState) {
    if (roomEvent.type === "m.room.name")
      roomName = roomEvent.content.name;
  }

  return roomName;
}

export const getRoomNameAsUser = async (user: user, roomId: string) => {
  const roomStateResponse = await getRoomState(roomId, user.access_token);
  const roomState = await roomStateResponse.json() as event[];

  let roomName = "default";

  for (const roomEvent of roomState) {
    if (roomEvent.type === "m.room.name")
      roomName = roomEvent.content.name;
  }

  return roomName;
}

export const createGroupUser = async (name: string) => {
  const newUserResponse = await registerUser(name);
  const user: user = await newUserResponse.json() as user;

  storeItem({
    type: "spacetube.group.user",
    userId: user.user_id,
    user,
    name: name,
    editToken: uuidv4()
  })

  setDisplayName(user, name);

  return user;
}

export const createGroupCloneUser = async (name: string, groupUserId: string, roomId: string) => {
  const newUserResponse = await registerUser(name);
  const user = await newUserResponse.json() as user;

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

export const createRoomInviteUser = async (name: string, groupUserId: string, roomId: string) => {
  const newUserResponse = await registerUser(name);
  const user = await newUserResponse.json() as user;

  storeItem({
    type: "spacetube.group.invite",
    originalUserId: groupUserId,
    originalName: name,
    userId: user.user_id,
    user,
    name: `${name} (invite user)`,
    roomId
  })

  setDisplayName(user, `${name} (invite user)`);

  return user;
}

export const createTubeUser = async (name, roomId, tubeIntermediary) => {
  console.log("creating tube user");
  console.log(name, roomId, tubeIntermediary);

  const newUserResponse = await registerUser(name);
  const user = await newUserResponse.json() as user;

  storeItem({
    type: "spacetube.user",
    userId: user.user_id,
    user,
    userRoomId: roomId,
    name: name,
  });

  setDisplayName(user, name);

  await inviteAsSpacetube(user, tubeIntermediary);
  await inviteAsSpacetube(user, roomId);

  console.log("it is done");

  return user;
};

const createClone = async (name, roomId, originalUserId) => {
  const newCloneUserResponse = await registerUser(name);
  const newCloneUser = await newCloneUserResponse.json() as user & { roomId: string };

  newCloneUser.roomId = roomId;

  storeItem({
    type: "spacetube.user.clone",
    clone: newCloneUser,
    originalUserId,
    cloneRoomId: roomId
  });

  setDisplayName(newCloneUser, name);

  await inviteAsSpacetube(newCloneUser, roomId);

  return newCloneUser;
};

export const registerTube = async (roomId) => {
  const tubeOpening = await getItem("name", `registration-${roomId}`);

  const tubeCode = tubeOpening
    ? tubeOpening.content.tubeCode
    : `${uuidv4()}~@spacetube_bot:${HOME_SERVER}`;

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

const connectRooms = async (roomId1: string, roomId2: string) => {
  console.log("connecting rooms");

  const connectedRooms = [roomId1, roomId2].sort();
  const tubeName = `open-${connectedRooms[0]}-${connectedRooms[1]}`;

  const existingTube = await getItem("name", tubeName);

  if (existingTube) {
    sendMessage(roomId1, "This tube is already active.");

    return existingTube;
  } else {
    const tubeRoomResponse = await createRoom();
    const tubeRoom = await tubeRoomResponse.json() as room;
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

const createTubeIntermediary = async (roomId1: string, roomId2: string) => {
  const connectedRooms = [roomId1, roomId2].sort();
  const tubeName = `open-${connectedRooms[0]}-${connectedRooms[1]}`;

  const tubeRoomResponse = await createRoom("Tube Intermediary");
  const tubeRoom = await tubeRoomResponse.json() as room;
  storeItem({
    name: tubeName,
    type: "spacetube.open",
    tubeIntermediary: tubeRoom.room_id,
    connectedRooms,
  });

  return tubeRoom.room_id;
}

const updateTubeIntermediary = async (tubeInterRoomId: string, newRoomId: string) => {
  console.log("updating tube intermediary", tubeInterRoomId)

  const tubeIntermediary = await getItem("tubeIntermediary", tubeInterRoomId, "spacetube.open");

  const oldConnectedRooms = tubeIntermediary.content.connectedRooms.slice();
  console.log("old cnnctedrooms", oldConnectedRooms);
  const connectedRooms = oldConnectedRooms.concat([newRoomId]);
  connectedRooms.sort();
  console.log("new cnnctedrooms", connectedRooms);

  const tubeName = `open-${connectedRooms.join("-")}`;

  await removeItem(tubeIntermediary.event_id, "updating tube intermediary");
  storeItem({
    name: tubeName,
    type: "spacetube.open",
    tubeIntermediary: tubeInterRoomId,
    connectedRooms,
  });
}

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
    const createdRoom = await createRoomResponse.json() as room;
    sharedTubeManagementRoom = createdRoom.room_id;

    await inviteAsSpacetube({ user_id: otherInstance, access_token: "" }, sharedTubeManagementRoom);
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
    const createdRoom = await createRoomResponse.json() as room;

    await inviteAsSpacetube({ user_id: otherInstance, access_token: "" }, createdRoom.room_id);

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
  if (event.sender !== `@spacetube_bot:${HOME_SERVER}`) {
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

const handleMessageLocalTube = async (tubeRoomLinks: TubeRoomLink[], event: event, message: string) => {
  const { context: { from } } = event.content;
  const connection = await getDuckDBConnection();

  const getTubeUserSQL = `SELECT * FROM UserTubeUserLinks WHERE tube_user_id='${event.sender}';`;
  const tubeUserRows = await connection.run(getTubeUserSQL);
  const tubeUsers = await tubeUserRows.getRowObjects();
  const tubeUser = tubeUsers[0];

  tubeRoomLinks.forEach(async link => {
    if (link.channel_id === from)
      return;

    switch (link.channel_type) {
      case "slack":

        break;
      case "matrix":
        const roomId = link.channel_id;
        const matrixUser = { user_id: tubeUser.tube_user_id, access_token: tubeUser.tube_user_access_token };

        // test if tubeUser is in the room
        const tubeUserMembershipSQL = `SELECT * FROM TubeUserRoomMemberships WHERE tube_user_id='${event.sender}' AND room_id='${roomId}';`;
        const tubeUserMembershipRows = await connection.run(tubeUserMembershipSQL);
        const tubeUserMemberships = await tubeUserMembershipRows.getRowObjects();
        const tubeUserMembership = tubeUserMemberships[0];

        if (!tubeUserMembership) {
          const inviteResponse = await inviteAsSpacetubeRequest(matrixUser, roomId);
          const inviteResult = await inviteResponse.json();
          console.log("invite result", inviteResult);
          const joinResponse = await join(matrixUser, roomId);
          const joinResult = await joinResponse.json();
          console.log("join result", joinResult)
          const insertTubeUserMembershipSQL = `INSERT INTO TubeUserRoomMemberships VALUES ('${event.sender}','${roomId}');`;
          connection.run(insertTubeUserMembershipSQL);
        }

        console.log("let's send this message")

        const sendResponse = await sendMessageAsUser(matrixUser, roomId, message);
        const sendResult = await sendResponse.json();

        console.log("send result", sendResult)

        break;
    }
  })

  /*
  const inviteUser = await getItem("originalUserId", event.sender, "spacetube.group.invite");
  const homeRoom = inviteUser.content.roomId;

  const { connectedRooms } = tubeRoom.content;

  for (const roomId of connectedRooms) {
    if (roomId !== homeRoom) {
      const groupCloneUsers = await getAllItems("roomId", roomId, "spacetube.group.clone");
      const groupCloneUser = groupCloneUsers.find(clone => clone.content.originalUserId === event.sender);
      if (groupCloneUser) {
        sendMessageAsUser(groupCloneUser.content.user, roomId, message);
      }
      else {
        const profileResponse = await getProfile(event.sender);
        const { displayname } = await profileResponse.json();
        const groupCloneUser = await createGroupCloneUser(displayname, event.sender, roomId);
        const receivingGroupInviteUser = await getItem("roomId", roomId, "spacetube.group.invite");
        const receivingGroupUser = await getItem("userId", receivingGroupInviteUser.content.originalUserId, "spacetube.group.user");
        await inviteAsUser(receivingGroupUser.content.user, groupCloneUser, roomId);
        const bigCloneUser = await getItem("userId", groupCloneUser.user_id, "spacetube.group.clone");
        onCloneUserJoin(bigCloneUser, roomId);
        sendMessageAsUser(groupCloneUser, roomId, message);
      }
    }
  }
  */
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

export const forwardToTubeIntermediary = async (tubeInterRoomId: string, event: event) => {
  console.log("passing message to tube intermediary");

  let user;

  const message = event.content.body;

  const inviteUser = await getItem("roomId", event.room_id, "spacetube.group.invite");
  const groupUser = await getItem("userId", inviteUser.content.originalUserId, "spacetube.group.user");

  sendMessageAsUser(groupUser.content.user, tubeInterRoomId, message);

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

const handleTubeRoomMessage = async (tubeRoomLinks, event) => {
  console.log("message in tube room");

  const message = event.content.body;
  handleMessageLocalTube(tubeRoomLinks, event, message);

  /*
  const tubeName = tubeRoom.content.name;
  if (tubeName.includes("~")) {
    handleMessageRemoteTube(tubeRoom, event, message);
    return;
  } else {
    handleMessageLocalTube(tubeRoom, event, message);
    return;
  }
    */
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

export const linkAsSpacetube = async (roomId: string, name: string) => {
  let linkEvent = await getItem("roomId", roomId, "spacetube.link");
  let linkToken;
  if (!linkEvent) {
    const newLinkToken = uuidv4();
    await storeItem({
      type: "spacetube.link",
      linkToken: newLinkToken,
      roomId: roomId,
    });
    linkToken = newLinkToken;
  } else {
    linkToken = linkEvent.content.linkToken;
  }

  const linkMessage = `Use this link to view the room: https://spacetube.${HOME_SERVER}/?linkToken=${linkToken}&name=${name}`;

  sendMessage(roomId, linkMessage);

  return { homeServer: HOME_SERVER, linkToken };
}

export const linkAsUser = async (roomId: string, name: string, groupUser = null) => {
  let linkEvent = await getItem("roomId", roomId, "spacetube.link");
  let linkToken;
  if (!linkEvent) {
    const newLinkToken = uuidv4();
    await storeItem({
      type: "spacetube.link",
      linkToken: newLinkToken,
      roomId: roomId,
    });
    linkToken = newLinkToken;
  } else {
    linkToken = linkEvent.content.linkToken;
  }

  const linkMessage = `Use this link to view the room: https://spacetube.${HOME_SERVER}/?linkToken=${linkToken}&name=${name}`;
  sendMessageAsUser(groupUser, roomId, linkMessage);

  return { homeServer: HOME_SERVER, linkToken };
};

const extractMessage = (body: string) => {
  const colonIncluded = body.split("</a>: ")[1];
  if (colonIncluded) {
    return colonIncluded;
  }
  else {
    const colonNotIncluded = body.split("</a>")[1];
    return colonNotIncluded;
  }
}

export const sendGroupUserMessage = async (event: event, body: string) => {
  const inviteUser = await getItem("roomId", event.room_id, "spacetube.group.invite");
  const groupUser = await getItem("userId", inviteUser.content.originalUserId);

  const message = extractMessage(body);

  sendMessageAsUser(groupUser.content.user, event.room_id, message);

  const tubeIntermediary = await getItemIncludes("connectedRooms", event.room_id);
  sendMessageAsUser(groupUser.content.user, tubeIntermediary.content.tubeIntermediary, message);
}

const handleFormat = async (event) => {
  const body = event.content.formatted_body;

  if (!body.split("href")[1])
    return;

  if (!body.split("href=")[1].split("\"")[1])
    return;

  const userId = body.split("href=")[1].split("\"")[1].split("/")[4];

  if (!userId)
    return;

  if (userId.includes("@spacetube_bot")) {
    if (body.includes("create")) {
      const groupName = await getRoomNameAsSpacetube(event.room_id);
      const groupUser = await createGroupUser(groupName);

      sendMessage(event.room_id, `Invite ${groupUser.user_id} to use in this group.`);
    }
  }

  const user = await getItem("userId", userId);

  if (user) {
    if (user.type === "spacetube.group.clone") {
      sendGroupUserMessage(event, body);
    }
    if (user.type === "spacetube.group.user") {
      if (body.includes("web")) {
        const profileResponse = await getProfile(event.sender);
        const { displayname } = await profileResponse.json();
        linkAsUser(event.room_id, displayname, user.content.user);
      }
      if (body.includes("profile")) {
        const editLink = `https://spacetube.${HOME_SERVER}/?groupUserEditToken=${user.content.editToken}`;
        const editMessage = `Use ${editLink} to edit my display name and profile picture`;
        sendMessageAsUser(user.content.user, event.room_id, editMessage);
      }
    }
  }

  if (userId.includes("@spacetube-whatsapp")) {
    handleFormatWhatsapp(event);
  }
}

const checkWhatsappUser = async (event: event) => {
  const whatsappUser = { user_id: `@${WHATSAPP_USER_ID}:${WHATSAPP_SERVER}`, access_token: WHATSAPP_ACCESS_TOKEN }
  const roomsResponse = await getJoinedRooms(whatsappUser);
  const { joined_rooms } = await roomsResponse.json();

  if (joined_rooms.includes(event.room_id)) {
    handleWhatsapp(event);
  }
  return;
}

export const handleMessage = async (event) => {
  /*
  const bridgeRoomEvent = await getItem("bridgeRoomId", event.room_id);
  if (bridgeRoomEvent) {
    handleBridgeMessage(event, bridgeRoomEvent);
  }
  */

  if (event.content.formatted_body) {
    handleFormat(event);
  }

  if (event.sender === `@spacetube_bot:${HOME_SERVER}`) return;

  if (event.sender === `@spacetube-whatsapp:${HOME_SERVER}`) return;

  checkWhatsappUser(event);

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
    const profileResponse = await getProfile(event.sender);
    const { displayname } = await profileResponse.json();
    linkAsSpacetube(event.room_id, displayname);
    return;
  }

  if (message.includes("!spacetube forward")) {
    console.log("forwarding message");
    commands.forward(event);
    return;
  }

  const connection = await getDuckDBConnection();
  const tubeRoomLinksSQL = `SELECT * FROM ChannelTubeRoomLinks WHERE tube_room_id='${event.room_id}'`;

  const tubeRoomLinkRows = await connection.run(tubeRoomLinksSQL);
  const tubeRoomLinks = await tubeRoomLinkRows.getRowObjects();

  console.log("tube room links", tubeRoomLinks)

  if (tubeRoomLinks) {
    handleTubeRoomMessage(tubeRoomLinks, event);
    return;
  }
};

export const onGroupUserJoin = async (invitedUser: event, roomId: string) => {
  const invitedUserId = invitedUser.content.userId;

  const profileResponse = await getProfile(invitedUserId);
  const { displayname } = await profileResponse.json();
  const roomInviteUser = await createRoomInviteUser(displayname, invitedUserId, roomId);

  const joinMessage = `Hello! I am your group's user! Ask other groups to invite ${roomInviteUser.user_id} to their rooms to talk to each other.`
  sendMessageAsUser(invitedUser.content.user, roomId, joinMessage);
  const editLink = `https://spacetube.${HOME_SERVER}/?groupUserEditToken=${invitedUser.content.editToken}`;
  const editMessage = `Use ${editLink} to edit my display name and profile picture`;
  sendMessageAsUser(invitedUser.content.user, roomId, editMessage);
}

export const onInviteUserJoin = async (invitedUser: event, roomId: string) => {
  const originalGroupUser = await getItem("userId", invitedUser.content.originalUserId);
  const profileResponse = await getProfile(invitedUser.content.originalUserId);
  const { displayname } = await profileResponse.json();
  const groupCloneUser = await createGroupCloneUser(displayname, invitedUser.content.originalUserId, roomId);

  inviteAsUser(invitedUser.content.user, groupCloneUser, roomId)
    .then(async () => {
      const bigCloneUser = await getItem("userId", groupCloneUser.user_id, "spacetube.group.clone");
      onCloneUserJoin(bigCloneUser, roomId);
    })

  let tubeInterRoomId;

  const tubeIntermediary = await getItemIncludes("connectedRooms", invitedUser.content.roomId);

  console.log("tube intermediary", tubeIntermediary)
  if (tubeIntermediary) {
    tubeInterRoomId = tubeIntermediary.content.tubeIntermediary;
    updateTubeIntermediary(tubeInterRoomId, roomId);
  }
  else {
    tubeInterRoomId = await createTubeIntermediary(roomId, invitedUser.content.roomId);
  }

  inviteAsSpacetube(originalGroupUser.content.user, tubeInterRoomId);

  const existingInviteUser = await getItem("roomId", roomId, "spacetube.group.invite");

  if (!existingInviteUser) {
    const groupName = await getRoomNameAsUser(invitedUser.content.user, roomId);
    const groupUser = await createGroupUser(groupName);
    inviteAsSpacetube(groupUser, tubeInterRoomId);
    await inviteAsUser(invitedUser.content.user, groupUser, roomId);
    const bigGroupUser = await getItem("userId", groupUser.user_id, "spacetube.group.user");
    await onGroupUserJoin(bigGroupUser, roomId);
  }
  else {
    const groupUser = await getItem("userId", existingInviteUser.content.originalGroupUser, "spacetube.group.user");
    inviteAsSpacetube(groupUser.content.user, tubeInterRoomId);
  }

  leaveRoom(invitedUser.content.user, roomId);
}

const onCloneUserJoin = (invitedUser: event, roomId: string) => {
  const joinMessage = `Hello! Use \`@${invitedUser.content.name}\` to send messages through the spacetube. Other messages in this room remain private.`
  sendMessageAsUser(invitedUser.content.user, roomId, joinMessage);
}

export const handleInvite = async (event) => {
  if (event.content.membership === "invite") {
    const invitedBySpacetubeBot = event.sender.includes("@spacetube_bot");
    const invitedBySpacetubeUser = event.sender.includes("@_spacetube");
    const invitedBySpacetubeWhatsapp = event.sender.includes("@spacetube-whatsapp");

    if (invitedBySpacetubeBot || invitedBySpacetubeUser || invitedBySpacetubeWhatsapp)
      return;

    const invitedUserId = event.state_key;

    if (invitedUserId.includes("@spacetube_bot")) {
      joinAsSpaceTube(event.room_id);
      return;
    }

    if (invitedUserId.includes("@spacetube-whatsapp")) {
      console.log("spacetube whatsapp invited");
      joinAsSpacetubeWhatsapp(event.room_id);
      console.log("attempting to join")
      return;
    }

    const invitedUser = await getItem("userId", invitedUserId);

    if (invitedUser) {

      await join(invitedUser.content.user, event.room_id);

      if (invitedUser.type === "spacetube.group.user") {
        onGroupUserJoin(invitedUser, event.room_id);
      }

      if (invitedUser.type === "spacetube.group.invite") {
        onInviteUserJoin(invitedUser, event.room_id);
      }

      if (invitedUser.type === "spacetube.group.clone") {
        onCloneUserJoin(invitedUser, event.room_id);
      }
    }

    /*
        if (
          event.sender.includes("@spacetube_bot") &&
          event.sender !== `@spacetube_bot:${HOME_SERVER}`
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
        */
  }
};

export const createInvitationRoom = async (groupUserId: string, groupName: string) => {
  const createFromRoomResponse = await createRoom(groupName);
  const room: room = await createFromRoomResponse.json() as room;

  const groupUser = await getItem("userId", groupUserId, "spacetube.group.user");
  await inviteAsSpacetube(groupUser.content.user, room.room_id);

  const inviteUser = await createRoomInviteUser(groupName, groupUserId, room.room_id);

  return { inviteUser, roomId: room.room_id };
}

export const createInvitationReceivedRoom = async (groupName: string, inviteUserId: string) => {
  const createToRoomResponse = await createRoom(groupName);
  const toRoom: room = await createToRoomResponse.json() as room;

  const invitedUser = await getItem("userId", inviteUserId);
  await inviteAsSpacetube(invitedUser.content.user, toRoom.room_id);
  await onInviteUserJoin(invitedUser, toRoom.room_id);

  return toRoom;
}