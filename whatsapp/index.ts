import * as sdk from "matrix-js-sdk";
import { event } from "../types";
import { RoomMemberEvent, RoomEvent, ClientEvent } from "matrix-js-sdk";
import { getDisplayName, getItem, storeItem } from "../matrix/storage.js";
import { joinAsSpaceTube, getRoomState, registerUser, join, inviteAsSpacetubeRequest } from "../matrix/matrixClientRequests.js";
import { inviteAsUser, onGroupUserJoin, onInviteUserJoin, createGroupUser, getRoomName, sendGroupUserMessage } from "../matrix/handler.js";

const { HOME_SERVER, WHATSAPP_HOME_SERVER, WHATSAPP_USER_ID, WHATSAPP_PASSWORD, WHATSAPP_ACCESS_TOKEN } = process.env;

let client;

const spacetubeWhatsappUser = {
    user_id: `@${WHATSAPP_USER_ID}:${WHATSAPP_HOME_SERVER}`,
    access_token: WHATSAPP_ACCESS_TOKEN
};

export const handleWhatsapp = async (event) => {
    console.log("handlnig whatsapp");
    console.log(event);
}

export const joinAsSpacetubeWhatsapp = async (roomId: string) => {
    await join(spacetubeWhatsappUser, roomId);
}

const inviteCommand = async (message, event) => {
    const partsOfMessage = message.split(" ");
    const inviteeUserId = partsOfMessage[partsOfMessage.length - 1];
    console.log("invitee user id", inviteeUserId);

    const groupUser = await getItem("userId", inviteeUserId, "spacetube.group.user");

    if (groupUser) {
        console.log("inviting group user")
        await inviteAsUser(spacetubeWhatsappUser, groupUser.content.user, event.room_id);
        onGroupUserJoin(groupUser, event.room_id);
    }

    const inviteUser = await getItem("userId", inviteeUserId, "spacetube.group.invite");

    if (inviteUser) {
        console.log("inviting invite user")
        await inviteAsUser(spacetubeWhatsappUser, inviteUser.content.user, event.room_id);
        onInviteUserJoin(inviteUser, event.room_id);
    }
}

const createCommand = async (event) => {
    const roomName = await getRoomName(event.room_id, WHATSAPP_ACCESS_TOKEN);
    const groupUser = await createGroupUser(roomName);
    await inviteAsUser(spacetubeWhatsappUser, groupUser, event.room_id);
    const bigGroupUser = await getItem("userId", groupUser.user_id, "spacetube.group.user");
    onGroupUserJoin(bigGroupUser, event.room_id);
}

export const handleFormatWhatsapp = async (event: event) => {
    console.log("event included @spacetube whatsapp", event);

    const message = event.content.body;

    if (message.includes("!invite")) {
        await inviteCommand(message, event);
        return;
    }

    if (message.includes("!create")) {
        await createCommand(event);
        return;
    }

    sendGroupUserMessage(event, event.content.formatted_body);
}

/*

export const startWhatsapp = async () => {
    client = sdk.createClient({ baseUrl: `https://matrix.${WHATSAPP_HOME_SERVER}` });

    await client.loginWithPassword(WHATSAPP_USER_ID, WHATSAPP_PASSWORD);

    await client.startClient({ initialSyncLimit: 10 });

    client.once(ClientEvent.Sync, async (state, prevState, res) => {
        // state will be 'PREPARED' when the client is ready to use
        console.log(state);
    });

    client.on(RoomMemberEvent.Membership, function (event, member) {
        if (
            member.membership === "invite" &&
            member.userId === `@${WHATSAPP_USER_ID}:${WHATSAPP_HOME_SERVER}`
        ) {
            client.joinRoom(member.roomId).then(function () {
                console.log("Auto-joined %s", member.roomId);
            });
        }
    });

    const scriptStart = Date.now();

    client.on(RoomEvent.Timeline, async function (event, room, toStartOfTimeline) {
        const roomId = event.event.room_id;

        const eventTime = event.event.origin_server_ts;

        if (scriptStart > eventTime) {
            return; //don't run commands for old messages
        }

        if (event.getType() !== "m.room.message") {
            return; // only use messages
        }

        if (event.event.sender === `@${WHATSAPP_USER_ID}:${WHATSAPP_HOME_SERVER}`) {
            return; //don't reply to your own messages
        }

        const spacetubebotJoined = room.getJoinedMembers().filter(member => member.userId === `@space-tube-bot:${HOME_SERVER}`);

        if (spacetubebotJoined.length < 1) {
            client.invite(roomId, `@space-tube-bot:${HOME_SERVER}`);
            await joinAsSpaceTube(roomId);
        }

        const message = event.event.content.body;

        if (event.event.sender === `@space-tube-bot:${HOME_SERVER}`) {
            client.sendTextMessage(roomId, `🤖spacetube🤖: ${message}`);
        }
        else {
            if (event.event.sender.slice(0, 9) !== "@whatsapp") {
                const displayName = room.getMember(event.event.sender).name || event.event.sender;
                client.sendTextMessage(roomId, `🎭${displayName}🎭: ${message}`);
            }
        }

        const reply = (text) => {
            client.sendTextMessage(roomId, text);
        };

        //use message.includes to test for spacetube command and to test for @otherGroup

        if (message.toLowerCase().includes("spacetube create")) {
            reply("🤖spacetube🤖 creating tube.");
            return;
        }

        //spacetube connect, sets up the @
        //also needs to create bridgeRoom and bridgeUser that handleMessage relates to

        //spacetube send, although this is now @whatever

        //spacetube link

        if (event.event.content.url) {
            const url = client.mxcUrlToHttp(event.event.content.url, 100, 100);
            console.log("WhatsApp login qr code url:", url);
        }
    });
};
*/

export const sendMessageWhatsapp = async (event, bridgeRoom) => {
    const message = event.event.content.body;
    const displayName = await getDisplayName(event.room_id, event.sender);

    //toDO, maybe if the user has a virtual @, use that?

    client.sendTextMessage(bridgeRoom.roomId, `🎭${displayName}🎭: ${message}`);
}