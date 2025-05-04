

export async function startRocketchat(app) {
    app.post("/rocketchat/event", async function (req, res) {
        const { event } = req.body;

        console.log(req);

        res.send({ success: true })

    });

    app.post("/rocketchat/register", async function (req, res) {
        const { url } = req.body;
        console.log(req);

        // duckdb set rocketchat ip pair to whatever


        res.send({ success: true });
    })
}