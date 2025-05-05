import { getRocketchatUrlIpLinkByIp, insertRocketchatUrlIpLink } from "../duckdb";

async function handleEvent(event, url) {
    console.log(event);

    sendMessage("GENERAL", "we done did it baby", url);
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
