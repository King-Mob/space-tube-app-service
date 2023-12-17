import express from "express";
import fetch from "node-fetch";
import {
  verifyKey,
  InteractionType,
  InteractionResponseType,
} from "discord-interactions";
import { storeItem, getItem, getDisplayName } from "../storage.js";
import {
  createRoom,
  invite,
  join,
  registerUser,
  sendMessageAsUser,
} from "../handler.js";

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = "https://discord.com/api/v10/" + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use node-fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent":
        "DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
    },
    ...options,
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function sendMessageDiscord(event, bridgeRoom) {
  console.log(event);
  console.log(bridgeRoom);
  console.log("sending message to discord");
  // send message as the space tube bot user

  /*
    DiscordRequest(`/channels/${bridgeRoom.channelId}/messages`, {
        method: "POST",
        body: {
            content: event.content.body
        }
    });*/

  let webhook;
  const webhookEvent = await getItem(
    "channelId",
    bridgeRoom.channelId,
    "spacetube.create.webhook"
  );
  if (webhookEvent) {
    webhook = webhookEvent.content;
  } else {
    const webhookResponse = await DiscordRequest(
      `/channels/${bridgeRoom.channelId}/webhooks`,
      {
        method: "POST",
        body: {
          name: "spacetube-webhook",
        },
      }
    );
    webhook = await webhookResponse.json();
    webhook.channelId = bridgeRoom.channelId;

    await storeItem({
      ...webhook,
      type: "spacetube.create.webhook",
    });
  }

  console.log(webhook);

  const displayName = await getDisplayName(event.room_id, event.sender);

  DiscordRequest(`/webhooks/${webhook.id}/${webhook.token}`, {
    method: "POST",
    body: {
      content: event.content.body,
      username: displayName || event.sender,
    },
  });

  // sending message using webhook
}

function VerifyDiscordRequest(clientKey) {
  return function (req, res, buf, encoding) {
    console.log("verifying");
    const signature = req.get("X-Signature-Ed25519");
    const timestamp = req.get("X-Signature-Timestamp");

    const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
    if (!isValidRequest) {
      res.status(401).send("Bad request signature");
      throw new Error("Bad request signature");
    }
    console.log("valid request", isValidRequest);
  };
}

export const startDiscord = (app) => {
  app.use(
    express.json({
      verify: VerifyDiscordRequest(process.env.DISCORD_PUBLIC_KEY),
    })
  );

  app.post("/interactions", async function (req, res) {
    // Interaction type and data
    const {
      body,
      body: { type, data },
    } = req;

    /**
     * Handle verification requests
     */
    if (type === InteractionType.PING) {
      console.log("ping");
      return res.send({ type: InteractionResponseType.PONG });
    }

    if (data.name === "echo") {
      const message = data.options[0].value;

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `you said: ${message}`,
        },
      });
    }

    if (data.name === "create") {
      console.log(body);
      const groupName = data.options[0].value;

      let room;

      const bridgeRoomEvent = await getItem("channelId", body.channel_id);
      console.log(bridgeRoomEvent);
      if (bridgeRoomEvent) {
        room = bridgeRoomEvent.content;
        room.room_id = room.roomId;
      } else {
        const roomResponse = await createRoom(groupName);
        room = await roomResponse.json();

        await storeItem({
          type: "spacetube.bridge.create",
          service: "discord",
          bridgeRoomId: room.room_id,
          roomId: room.room_id,
          channelId: body.channel_id,
          guildId: body.guild_id,
        });
      }

      console.log(room);

      let user;
      const bridgeUserEvent = await getItem("bridgeUserRoomId", room.room_id);
      if (bridgeUserEvent) {
        user = bridgeUserEvent.content;
        user.access_token = user.user.access_token;
      } else {
        const userResponse = await registerUser(`disco-${groupName}`);
        user = await userResponse.json();

        await storeItem({
          type: "spacetube.bridge.user.create",
          userId: user.user_id,
          user: user,
          bridgeUserRoomId: room.room_id,
          userRoomId: room.room_id,
          guildId: body.guild_id,
          channelId: body.channel_id,
        });
      }

      await invite(user, room.room_id);
      await join(user, room.room_id);

      sendMessageAsUser(user, room.room_id, "!space-tube create");

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `creating a new tube`,
        },
      });
    }

    if (data.name === "connect") {
      const connectionCode = data.options[0].value;

      const bridgeRoomEvent = await getItem(
        "channelId",
        body.channel_id,
        "spacetube.bridge.create"
      );
      const bridgeRoom = bridgeRoomEvent.content;

      const bridgeUserEvent = await getItem(
        "bridgeUserRoomId",
        bridgeRoom.roomId
      );
      const bridgeUser = bridgeUserEvent.content;

      sendMessageAsUser(
        bridgeUser.user,
        bridgeRoom.roomId,
        `!space-tube connect ${connectionCode}`
      );

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `connecting you to the tube`,
        },
      });
    }

    if (data.name === "send") {
      const message = data.options[0].value;

      const bridgeRoomEvent = await getItem(
        "channelId",
        body.channel_id,
        "spacetube.bridge.create"
      );
      const bridgeRoom = bridgeRoomEvent.content;

      const bridgeUserEvent = await getItem(
        "bridgeUserRoomId",
        bridgeRoom.roomId
      );
      const bridgeUser = bridgeUserEvent.content;

      sendMessageAsUser(bridgeUser.user, bridgeRoom.roomId, message);

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `sending to the tube`,
        },
      });
    }

    if (data.name === "link") {
      const bridgeRoomEvent = await getItem(
        "channelId",
        body.channel_id,
        "spacetube.bridge.create"
      );
      const bridgeRoom = bridgeRoomEvent.content;

      const bridgeUserEvent = await getItem(
        "bridgeUserRoomId",
        bridgeRoom.roomId
      );
      const bridgeUser = bridgeUserEvent.content;

      sendMessageAsUser(bridgeUser.user, bridgeRoom.roomId, `!spacetube link`);

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `generating tube link`,
        },
      });
    }
  });
};
