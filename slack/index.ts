function create(event) {
    console.log("create event sent")
    // makes a tube room
    // creates link between channel and tube room
    //      one in tube management, one in tube room state
    //      channel type Slack, channel id, Cwhatever
    // makes an invite code
    // creates link between tube room and invite code
    // sends message with invite code to channel
}

function connect(event) {
    console.log("connect event sent")
    // retrieves link between invite code and tube room
    // creates link between channel and tube room
    //      one in tube management, one in tube room state
}

function forward(event) {
    console.log("forward event sent")
    // retrives link between channel and tube room
    // creates/retrieves link between user and tube room
    // send message to tube room as user
    //	    message includes "from" to ensure not returned to channel
}

function handleMention(event) {
    if (event.text.includes("!create")) {
        create(event);
        return;
    }

    if (event.text.includes("!connect")) {
        connect(event);
        return;
    }

    forward(event);
    return;
}

export function startSlack(app) {
    const { SLACK_TOKEN } = process.env;

    console.log("SLAAACK", SLACK_TOKEN);

    const possibleUsernames = ["buddy", "the sAuSaGe", "Britches", "second piano"]

    const username = possibleUsernames[Math.floor(Math.random() * possibleUsernames.length)]



    app.get("/slack", async function (req, res) {
        return res.send("hello from slack component")
    })

    app.post("/slack/events", async function (req, res) {
        console.log(req.body);
        const { challenge, event } = req.body;

        if (challenge)
            return res.send(challenge);

        if (event.type === "app_mention") {

            handleMention(event);
        }

    })

}

