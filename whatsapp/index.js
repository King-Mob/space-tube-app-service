import * as sdk from "matrix-js-sdk";
import { RoomMemberEvent, RoomEvent, ClientEvent } from "matrix-js-sdk";
import { getDisplayName, getItem, storeItem } from "../storage.js";
import { joinAsSpaceTube, getRoomState, registerUser, join, invite } from "../matrixClientRequests.js";

const { HOME_SERVER, WHATSAPP_HOME_SERVER, WHATSAPP_USER_ID, WHATSAPP_PASSWORD } = process.env;

let client;

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

        const spacetubebotJoined = room.getJoinedMembers().filter(member => member.userId === `@space-tube-bot:${HOME_SERVER}`);

        if (!spacetubebotJoined) {
            client.invite(roomId, `@space-tube-bot:${HOME_SERVER}`);
            await joinAsSpaceTube(roomId)
        }

        if (scriptStart > eventTime) {
            return; //don't run commands for old messages
        }

        if (event.getType() !== "m.room.message") {
            return; // only use messages
        }

        if (event.event.sender === `@${WHATSAPP_USER_ID}:${WHATSAPP_HOME_SERVER}`) {
            return; //don't reply to your own messages
        }

        const message = event.event.content.body;

        if (event.event.sender === `@space-tube-bot:${HOME_SERVER}`) {
            client.sendTextMessage(roomId, `🤖spacetube🤖: ${message}`);
        }
        else {
            const displayName = room.getMember(event.event.sender).name || event.event.sender;
            client.sendTextMessage(roomId, `🎭${displayName}🎭: ${message}`)
        }

        const reply = (text) => {
            client.sendTextMessage(roomId, text);
        };

        if (message.toLowerCase().includes("spacetube echo")) {
            reply("🤖spacetube🤖" + message.replace("spacetube echo", ""));
        }

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

export const sendMessageWhatsapp = async (event, bridgeRoom) => {
    const message = event.event.content.body;
    const displayName = await getDisplayName(event.room_id, event.sender);

    //toDO, maybe if the user has a virtual @, use that?

    client.sendTextMessage(bridgeRoom.roomId, `🎭${displayName}🎭: ${message}`);
}