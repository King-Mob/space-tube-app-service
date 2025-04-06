const { HOME_SERVER, URL } = process.env;

export const getTubeInfoRequest = async (linkToken) => {
  return fetch(`${URL}/api/tubeInfo?linkToken=${linkToken}`);
};

export const getRoomRequest = async (user, matrixRoomId) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${matrixRoomId}/messages?limit=1000`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
    }
  );
};

export const getEditTokenRequest = async (linkToken) => {
  return fetch(`${URL}/api/tubeInfo/editToken?linkToken=${linkToken}`);
};

export const registerRequest = async (linkToken, userName) => {
  return fetch(`${URL}/api/register`, {
    method: "POST",
    body: JSON.stringify({ linkToken, userName }),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const sendMessageRequest = async (matrixRoom, message, user) => {
  fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${matrixRoom.roomId}/send/m.room.message`,
    {
      method: "POST",
      body: JSON.stringify({
        body: message,
        msgtype: "m.text",
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
    }
  );
};

export const forwardMessageRequest = async (matrixRoom, txnId, event, user) => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${matrixRoom.roomId}/send/spacetube.forward/${txnId}?user_id=@${user.userId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        type: "spacetube.forward",
        body: event.content.body,
        originalEventId: event.event_id,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
    }
  );
};

export const getInviteRequest = async (inviteUserId: string) => {
  return fetch(`${URL}/api/invite?inviteUserId=${inviteUserId}`);
};

export const createInviteRequest = async (name: string, groupUserId: string, groupName: string) => {
  return fetch(`${URL}/api/invite/create`, {
    method: "POST",
    body: JSON.stringify({ name, groupUserId, groupName }),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const acceptInviteRequest = async (inviteUserId, myName: string, groupName: string) => {
  return fetch(`${URL}/api/invite/accept`, {
    method: "POST",
    body: JSON.stringify({ myName, groupName, inviteUserId }),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const syncRequest = async (user, nextBatch = "") => {
  return fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/sync?timeout=30000${nextBatch ? `&since=${nextBatch}` : ""
    }`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
    }
  );
};

export const syncTubeRequest = async (linkToken, nextBatch) => {
  return fetch(
    `${URL}/api/tubeInfo/sync?linkToken=${linkToken}${nextBatch ? `&nextBatch=${nextBatch}` : ""
    }`
  );
};

export const getTubeUserIdsRequest = async (linkToken) => {
  return fetch(`${URL}/api/tubeInfo/userIds?linkToken=${linkToken}`)
}

export const matrixRoomInviteRequest = async (user, inviteUserId, roomId) => {
  return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/invite`,
    {
      method: "POST",
      body: JSON.stringify({
        user_id: inviteUserId
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
    })
}

export const createGroupUserRequest = async (groupName: string) => {
  return fetch(`${URL}/api/groupuser`, {
    method: "POST",
    body: JSON.stringify({ groupName }),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const getDisplayNameRequest = async (token: string) => {
  return fetch(`${URL}/api/groupuser/name?token=${token}`);
}

export const getProfilePictureRequest = async (token: string) => {
  return fetch(`${URL}/api/groupuser/picture?token=${token}`);
}

export const changeGroupUserRequest = async (token: string, groupUserInfo: { displayName: string, profilePicture: File }) => {
  const body = new FormData();

  body.append("profilePicture", groupUserInfo.profilePicture);
  body.append("displayName", groupUserInfo.displayName);

  console.log(body)

  return fetch(`${URL}/api/groupuser/?token=${token}`, {
    method: "PUT",
    body
  })
}

export const getDisplayNamesRequest = async (token: string) => {
  return fetch(`${URL}/api/tubeinfo/displaynames/?linkToken=${token}`);
}

export const processSlackRequest = async (slackCode: string) => {
  return fetch(`${URL}/api/slack/process/?slackCode=${slackCode}`);
}