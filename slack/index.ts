import { getDuckDBConnection } from "../duckdb";
import { sendMessageAsUser, registerUser, setDisplayName, inviteAsSpacetubeRequest, join } from "../matrix/matrixClientRequests";

const { SLACK_TOKEN, SLACK_BOT_USER_ID } = process.env;

function create(event) {
    console.log("create event sent")
    // makes a tube room
    // creates link between channel and tube room
    //      in duckDB
    //      e.g. 'C08LV6R3UF7', 'slack', '!MPYlXGrdptSscBRvAb:spacetu.be'
    // makes an invite code
    // creates link between tube room and invite code
    //      e.g. '!MPYlXGrdptSscBRvAb:spacetu.be' , 35435g-34tj3-tioj4-30fdf0

    // sends message with invite code to channel
}

function connect(event) {
    console.log("connect event sent")
    // retrieves link between invite code and tube room
    // creates link between channel and tube room
    //      in duckDB
}

async function forward(event) {
    const connection = await getDuckDBConnection();

    const linkRows = await connection.run(`SELECT * FROM ChannelTubeRoomLinks WHERE channel_id='${event.channel}';`);
    const links = await linkRows.getRowObjects();

    const link = links[0];

    if (link) {
        const userRows = await connection.run(`SELECT * FROM UserTubeUserLinks WHERE user_id='${event.user}'`);
        const users = await userRows.getRowObjects();

        const user = users[0];
        const message = event.text.replace(SLACK_BOT_USER_ID, "");

        if (user) {
            const matrixUser = { user_id: user.tube_user_id, access_token: user.tube_user_access_token };
            sendMessageAsUser(matrixUser, link.tube_room_id, message, { from: event.channel });
        }
        else {
            const slackUserResponse = await fetch(`https://slack.com/api/users.profile.get?user=${event.user}`, {
                headers: {
                    Authorization: `Bearer ${SLACK_TOKEN}`
                }
            })
            const slackUser = await slackUserResponse.json();
            const displayName = slackUser.profile.display_name || slackUser.profile.first_name + " " + slackUser.profile.last_name;
            const matrixUserResponse = await registerUser(displayName);
            const matrixUser = await matrixUserResponse.json();
            setDisplayName(matrixUser, displayName);
            await inviteAsSpacetubeRequest(matrixUser, link.tube_room_id);
            await join(matrixUser, link.tube_room_id);
            sendMessageAsUser(matrixUser, link.tube_room_id, message, { from: event.channel });

            const insertUserSQL = `INSERT INTO UserTubeUserLinks VALUES ('${event.user}','${matrixUser.user_id}','${matrixUser.access_token}');`;
            connection.run(insertUserSQL);
        }
    }
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

const previousEvents = [];

export async function startSlack(app) {
    console.log("SLAAACK", SLACK_TOKEN);

    app.get("/slack", async function (req, res) {
        return res.send("hello from slack component")
    })

    app.post("/slack/events", async function (req, res) {
        const { challenge, event } = req.body;

        // slack sends events twice, we only want to handle the first one
        if (previousEvents.find(previousEvent => previousEvent.event_ts === event.event_ts)) {
            return;
        }
        else {
            previousEvents.push(event);
        }

        if (challenge)
            return res.send(challenge);

        if (event.type === "app_mention") {
            console.log("slack event", event)
            handleMention(event);
        }
    })
}

export async function sendSlackMessage(channel: string, text: string, username: string) {
    return fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        body: JSON.stringify({
            channel,
            text,
            username
        }),
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SLACK_TOKEN}`,
        }
    })
}