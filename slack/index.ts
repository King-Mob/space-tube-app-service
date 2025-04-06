import { getDuckDBConnection } from "../duckdb";
import { sendMessageAsUser, registerUser, setDisplayName, inviteAsSpacetubeRequest, join } from "../matrix/matrixClientRequests";

const { SLACK_SECRET, SLACK_CLIENT_ID } = process.env;

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

async function connect(event) {
    console.log("connect event sent")
    const inviteCode = event.text.split("!connect ")[1];

    const connection = await getDuckDBConnection();

    const getInviteTubeRoomLinkSQL = `SELECT * FROM InviteTubeRoomLinks WHERE invite_code='${inviteCode}';`;
    const inviteTubeRoomsLinkRows = await connection.run(getInviteTubeRoomLinkSQL);
    const inviteTubeRoomsLinks = inviteTubeRoomsLinkRows.getRowObjects();
    const { tube_room_id } = inviteTubeRoomsLinks[0];

    const insertChannelTubeRoomLink = `INSERT INTO ChannelTubeRoomLinks VALUES ('${event.channel}', 'slack', '${tube_room_id}');`
    await connection.run(insertChannelTubeRoomLink);

    sendSlackMessage(event.channel, "You have joined the spacetube!", "spacetube");
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

        const { bot_token, bot_user_id } = await getBot(event.channel);
        const message = event.text.replace(`<@${bot_user_id}>`, "");

        if (user) {
            const matrixUser = { user_id: user.tube_user_id, access_token: user.tube_user_access_token };
            sendMessageAsUser(matrixUser, link.tube_room_id, message, { from: event.channel });
        }
        else {
            const slackUserResponse = await fetch(`https://slack.com/api/users.profile.get?user=${event.user}`, {
                headers: {
                    Authorization: `Bearer ${bot_token}`
                }
            });
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

    app.get("/api/slack/process/", async function (req, res) {
        const { slackCode } = req.query;
        const connection = await getDuckDBConnection();

        const data = new URLSearchParams();
        data.append("code", slackCode);
        data.append("client_id", SLACK_CLIENT_ID);
        data.append("client_secret", SLACK_SECRET);

        console.log("slack process request got through")

        const slackResponse = await fetch("https://slack.com/api/oauth.v2.access", {
            method: "POST",
            body: data
        });
        const slackResult = await slackResponse.json();

        console.log("slack result", slackResult)

        if (slackResult.ok) {
            const { access_token, team: { id }, bot_user_id } = slackResult;

            const insertTeamBotTokenLink = `INSERT INTO SlackTeamBotTokenLinks VALUES ('${id}','${access_token}','${bot_user_id}');`;
            connection.run(insertTeamBotTokenLink);

            return res.send({ success: true });
        }

        return res.send({ success: false });
    })
}

async function getBot(channel_id: string) {
    const connection = await getDuckDBConnection();
    const getChannelTeamLinksSQL = `SELECT * FROM SlackChannelTeamLinks WHERE channel_id='${channel_id}';`;
    const channelTeamLinkRows = await connection.run(getChannelTeamLinksSQL);
    const channelTeamLinks = await channelTeamLinkRows.getRowObjects();
    const { team_id } = channelTeamLinks[0];

    const getBotTokenSQL = `SELECT * FROM SlackTeamBotTokenLinks WHERE team_id='${team_id}';`;
    const teamBotTokenLinkRows = await connection.run(getBotTokenSQL);
    const teamBotTokenLinks = await teamBotTokenLinkRows.getRowObjects();
    const { bot_token, bot_user_id } = teamBotTokenLinks[0];
    return { bot_token, bot_user_id };
}

export async function sendSlackMessage(channel: string, text: string, username: string) {
    const { bot_token } = await getBot(channel);

    return fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        body: JSON.stringify({
            channel,
            text,
            username
        }),
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bot_token}`,
        }
    })
}