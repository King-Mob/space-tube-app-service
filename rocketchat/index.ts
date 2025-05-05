import { getRocketchatUrlIpLinkByIp, insertRocketchatUrlIpLink, getTubeRoomLinkByChannelId } from "../duckdb";
import { generateInviteCode } from "../slack";

const { INVITE_PREFIX } = process.env;

async function echo(event, url) {
    const message = event.text;
    const newMessage = "you said: " + message.split("!echo ")[1];

    sendMessage(event.room.id, newMessage, url);
}

async function create(event, message) {}

async function remindInviteCode(existingTube) {}

async function connect(event, message) {}

async function forward(event, message) {}

async function handleEvent(event, url) {
    const channelId = `${event.room.id}@${url}`;

    const existingTube = await getTubeRoomLinkByChannelId(channelId);
    const message = event.params.join(" ");
    const messageNoSpaces = message.replaceAll(" ", "");

    if (!existingTube) {
        if (messageNoSpaces.includes(INVITE_PREFIX)) {
            connect(event, messageNoSpaces);
            return;
        } else {
            create(event, messageNoSpaces);
            return;
        }
    } else {
        if (!messageNoSpaces) {
            remindInviteCode(existingTube);
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
