import { v4 as uuidv4 } from "uuid";

import { user } from "../types";

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

export const sendMessageAsUser = (user: user, roomId: string, message: string) => {
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

export const createRoom = (name: string = "no room name") => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/createRoom?user_id=@space-tube-bot:${HOME_SERVER}`,
    {
      method: "POST",
      body: JSON.stringify({
        name: name
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APPLICATION_TOKEN}`,
      },
    }
  );
};

export const getRoomState = (roomId: string, token: string | null) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/state`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token ? token : APPLICATION_TOKEN}`,
      },
    }
  );
};

export const registerUser = (name: string) => {
  return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/register`, {
    method: "POST",
    body: JSON.stringify({
      type: "m.login.application_service",
      username: `_space-tube-${name}-${uuidv4()}`,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${APPLICATION_TOKEN}`,
    },
  });
};

export const setDisplayName = (user: user, displayName: string) => {
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

export const setProfilePicture = (user: user, avatar_url: string) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/profile/${user.user_id}/avatar_url`,
    {
      method: "PUT",
      body: JSON.stringify({
        avatar_url,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.access_token}`,
      },
    }
  );
};

export const invite = (user: user, roomId: string) => {
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

export const inviteAsUser = (inviter: user, invitee: user, roomId: string) => {
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

export const join = (user: user, roomId: string) => {
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

export const joinAsSpaceTube = (roomId: string) => {
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

export const getRoomsList = async (user: user) => {
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

export const sync = async (user: user, nextBatch = null) => {
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

export const leaveRoom = async (user: user, roomId: string) => {
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

export const uploadImage = async (fileName: string, image) => {
  return fetch(`https://matrix.${HOME_SERVER}/_matrix/media/v3/upload?Content-Type=image&filename=${fileName}`,
    {
      method: "POST",
      body: image,
      headers: {
        "Content-Type": "application/octet-stream",
        Authorization: `Bearer ${APPLICATION_TOKEN}`
      },
    })
}

export const getProfile = async (userId: string) => {
  return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/profile/${userId}`, {
    headers: {
      Authorization: `Bearer ${APPLICATION_TOKEN}`
    }
  })
}

export const getImage = async (serverName: string, mediaId: string) => {
  return fetch(`https://matrix.${HOME_SERVER}/_matrix/media/v3/download/${serverName}/${mediaId}`, {
    headers: {
      Authorization: `Bearer ${APPLICATION_TOKEN}`
    }
  })
}