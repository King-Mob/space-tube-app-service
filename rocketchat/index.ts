

export async function startRocketchat(app) {
    app.post("/rocketchat/event", async function (req, res) {
        const { event } = req.body;
        const { headers } = req.body;
        const serverIP = headers["x-real-ip"];

        console.log(event, serverIP);

        // duckdb, check for url for ip
        // if none, return {registration: false}


        res.send({ success: true })

    });

    app.post("/rocketchat/register", async function (req, res) {
        const { url } = req.body;
        const { headers } = req.body;
        const serverIP = headers["x-real-ip"];

        console.log(url, serverIP);

        // duckdb set rocketchat ip pair to whatever

        res.send({ success: true });
    })
}