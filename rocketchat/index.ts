import { getRocketchatUrlIpLinkByIp, insertRocketchatUrlIpLink } from "../duckdb";

async function handleEvent(event, url) {
    console.log(event);

    fetch(url, {
        method: "POST",
        body: JSON.stringify({
            roomId: "GENERAL",
            text: "we done did it baby",
        }),
    });
}

export async function startRocketchat(app) {
    app.post("/rocketchat/event", async function (req, res) {
        const event = req.body;
        const serverIP = req.headers["x-real-ip"];

        const urlIpLink = await getRocketchatUrlIpLinkByIp(serverIP);

        if (urlIpLink[0]) {
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
