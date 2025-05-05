import {
    getRocketchatUrlIpLinkByIp,
    insertRocketchatUrlIpLink,
    getTubeRoomLinkByChannelId,
    insertChannelTubeRoomLink,
    insertInviteTubeRoomLink,
    getInviteCodeByTubeId,
    getInviteTubeRoomLink,
    deleteChannelTubeRoomLinks,
} from "../duckdb";
import { generateInviteCode } from "../slack";
import { createRoom } from "../matrix/matrixClientRequests";

const { INVITE_PREFIX } = process.env;

async function echo(event, url) {
    const message = event.text;
    const newMessage = "you said: " + message.split("!echo ")[1];

    sendMessage(event.room.id, newMessage, url);
}

async function create(event, message, url) {
    const channelId = `${event.room.id}@${url}`;
    const createRoomResponse = await createRoom("tube room");
    const createRoomResult = await createRoomResponse.json();
    const tube_room_id = createRoomResult.room_id;

    const optionalInviteText = message;
    const inviteCode = generateInviteCode(optionalInviteText);

    insertChannelTubeRoomLink(channelId, "rocketchat", tube_room_id);
    insertInviteTubeRoomLink(inviteCode, tube_room_id);

    sendMessage(event.room.id, `Tube is open with invite code: ${inviteCode}`, url);
    //add message about what the other group needs to do
}

async function remindInviteCode(existingTube, url) {
    const existingInviteCode = await getInviteCodeByTubeId(existingTube.tube_room_id);

    sendMessage(
        existingTube.channel_id.split("@")[0],
        `Tube already open with invite code: ${existingInviteCode.invite_code}`,
        url
    );
}

async function connect(event, message, url) {
    const invite = await getInviteTubeRoomLink(message);

    if (invite) {
        deleteChannelTubeRoomLinks(event.channel);

        insertChannelTubeRoomLink(event.channel, "slack", invite.tube_room_id);
        sendMessage(event.room.id, "You have joined the spacetube!", url);
        //add message about how to send messages
    } else {
        sendMessage(event.room.id, "No tube found for that invite code", url);
    }
}

async function forward(event, message) {}

async function handleEvent(event, url) {
    const channelId = `${event.room.id}@${url}`;

    const existingTube = await getTubeRoomLinkByChannelId(channelId);
    const message = event.params.join(" ");
    const messageNoSpaces = message.replaceAll(" ", "");

    if (!existingTube) {
        if (messageNoSpaces.includes(INVITE_PREFIX)) {
            connect(event, messageNoSpaces, url);
            return;
        } else {
            create(event, messageNoSpaces, url);
            return;
        }
    } else {
        if (!messageNoSpaces) {
            remindInviteCode(existingTube, url);
            return;
        } else {
            if (messageNoSpaces.includes("!echo")) {
                echo(event, url);
                return;
            }

            forward(event, message);
            return;
        }
    }
}

async function sendMessage(roomId, text, url) {
    console.log(url, roomId, text);

    fetch(url, {
        method: "POST",
        body: JSON.stringify({
            roomId,
            text,
        }),
        headers: {
            "Content-type": "application/json",
            Authorization: "Bearer whatever-some-token",
        },
    });
}

export async function startRocketchat(app) {
    app.post("/rocketchat/event", async function (req, res) {
        const event = req.body;
        const serverIP = req.headers["x-real-ip"];

        const urlIpLinks = await getRocketchatUrlIpLinkByIp(serverIP);
        const urlIpLink = urlIpLinks[0];

        if (urlIpLink) {
            handleEvent(event, urlIpLink.url);
            res.send({ success: true });
        } else {
            res.send({ success: false, registration: false });
        }
    });

    app.post("/rocketchat/register", async function (req, res) {
        const { url } = req.body;
        const serverIP = req.headers["x-real-ip"];

        console.log(url, serverIP);

        insertRocketchatUrlIpLink(url, serverIP);

        res.send({ success: true });
    });
}
