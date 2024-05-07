import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";

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

export const getRoomState = (roomId, token = APPLICATION_TOKEN) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/state`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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

export const inviteAsUser = (inviter, invitee, roomId) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/invite`,
    {
      method: "POST",
      body: JSON.stringify({
        user_id: invitee.user_id,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${inviter.access_token}`,
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

export const joinAsSpaceTube = (roomId) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/join/${roomId}?user_id=@space-tube-bot:${HOME_SERVER}`,
    {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APPLICATION_TOKEN}`,
      },
    }
  );
};

export const getRoomsList = async (user) => {
  const response = await fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/joined_rooms`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.access_token}`,
      },
    }
  );

  return response.json();
};

export const sync = async (user, nextBatch = null) => {
  const response = await fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/sync?timeout=30000${nextBatch ? `&since=${nextBatch}` : ""
    }`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.access_token}`,
      },
    }
  );

  return response.json();
};

export const leaveRoom = async (user, roomId) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/leave`,
    {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.access_token}`,
      },
    }
  );
}