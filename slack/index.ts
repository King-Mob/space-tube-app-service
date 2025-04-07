import { getDuckDBConnection } from "../duckdb";
import xkpasswd from "xkpasswd";
import {
    sendMessageAsUser,
    registerUser,
    setDisplayName,
    inviteAsSpacetubeRequest,
    join,
    createRoom,
} from "../matrix/matrixClientRequests";

const { SLACK_SECRET, SLACK_CLIENT_ID } = process.env;

async function create(event) {
    const connection = await getDuckDBConnection();

    const getExistingChannelTubeRoomLinks = `SELECT * FROM ChannelTubeRoomLinks WHERE channel_id='${event.channel}'; `;
    const existingChannelTubeRoomLinkRows = await connection.run(getExistingChannelTubeRoomLinks);
    const existingChannelTubeRoomLinks = await existingChannelTubeRoomLinkRows.getRowObjects();
    const existingChannelTubeRoomLink = existingChannelTubeRoomLinks[0];

    if (existingChannelTubeRoomLink) {
        const getExistingInviteCode = `SELECT * FROM InviteTubeRoomLinks WHERE tube_room_id='${existingChannelTubeRoomLink.tube_room_id}';`;
        const existingInviteCodeRows = await connection.run(getExistingInviteCode);
        const existingInviteCodes = await existingInviteCodeRows.getRowObjects();
        const existingInviteCode = existingInviteCodes[0];

        sendSlackMessage(
            event.channel,
            `Tube already open with invite code: ${existingInviteCode.invite_code}`,
            "spacetube"
        );
    } else {
        const createRoomResponse = await createRoom("slack tube room");
        const createRoomResult = await createRoomResponse.json();
        const tube_room_id = createRoomResult.room_id;

        const insertChannelTubeRoomLink = `INSERT INTO ChannelTubeRoomLinks VALUES ('${event.channel}', 'slack', '${tube_room_id}');`;
        await connection.run(insertChannelTubeRoomLink);

        const insertChannelTeamLink = `INSERT INTO SlackChannelTeamLinks VALUES ('${event.channel}','${event.team}');`;
        await connection.run(insertChannelTeamLink);

        const customInviteCode = event.text.split("!create ")[1];
        const inviteCode = customInviteCode || xkpasswd({ separators: "" });

        const insertInviteTubeRoomLink = `INSERT INTO InviteTubeRoomLinks VALUES ('${inviteCode}','${tube_room_id}');`;
        await connection.run(insertInviteTubeRoomLink);

        sendSlackMessage(event.channel, `Tube is open with invite code: ${inviteCode}`, "spacetube");
    }
}

async function connect(event) {
    const inviteCode = event.text.split("!connect ")[1];

    const connection = await getDuckDBConnection();

    const getInviteTubeRoomLinkSQL = `SELECT * FROM InviteTubeRoomLinks WHERE invite_code='${inviteCode}';`;
    const inviteTubeRoomsLinkRows = await connection.run(getInviteTubeRoomLinkSQL);
    const inviteTubeRoomsLinks = await inviteTubeRoomsLinkRows.getRowObjects();

    const { tube_room_id } = inviteTubeRoomsLinks[0];

    const deleteExistingChannelTubeRoomLinks = `DELETE FROM ChannelTubeRoomLinks WHERE channel_id='${event.channel}';`;
    await connection.run(deleteExistingChannelTubeRoomLinks);

    const deleteExistingChannelTeamLinks = `DELETE FROM SlackChannelTeamLinks WHERE channel_id='${event.channel}';`;
    await connection.run(deleteExistingChannelTeamLinks);

    const insertChannelTubeRoomLink = `INSERT INTO ChannelTubeRoomLinks VALUES ('${event.channel}', 'slack', '${tube_room_id}');`;
    await connection.run(insertChannelTubeRoomLink);

    const insertChannelTeamLink = `INSERT INTO SlackChannelTeamLinks VALUES ('${event.channel}','${event.team}');`;
    await connection.run(insertChannelTeamLink);

    sendSlackMessage(event.channel, "You have joined the spacetube!", "spacetube");
}

async function forward(event) {
    const connection = await getDuckDBConnection();

    const linkRows = await connection.run(`SELECT * FROM ChannelTubeRoomLinks WHERE channel_id='${event.channel}';`);
    const links = await linkRows.getRowObjects();

    links.forEach(async (link) => {
        const userRows = await connection.run(`SELECT * FROM UserTubeUserLinks WHERE user_id='${event.user}'`);
        const users = await userRows.getRowObjects();

        const user = users[0];

        const { bot_token, bot_user_id } = await getBot(event.channel);
        const message = event.text.replace(`<@${bot_user_id}>`, "");

        console.log(message);

        if (user) {
            console.log("user exists, sending message");
            const matrixUser = {
                user_id: user.tube_user_id,
                access_token: user.tube_user_access_token,
            };
            const tubeUserMembershipSQL = `SELECT * FROM TubeUserRoomMemberships WHERE tube_user_id='${user.tube_user_id}' AND room_id='${link.tube_room_id}';`;
            const tubeUserMembershipRows = await connection.run(tubeUserMembershipSQL);
            const tubeUserMemberships = await tubeUserMembershipRows.getRowObjects();
            const tubeUserMembership = tubeUserMemberships[0];

            if (!tubeUserMembership) {
                await inviteAsSpacetubeRequest(matrixUser, link.tube_room_id);
                await join(matrixUser, link.tube_room_id);
                const insertTubeUserMembershipSQL = `INSERT INTO TubeUserRoomMemberships VALUES ('${user.tube_user_id}','${link.tube_room_id}');`;
                connection.run(insertTubeUserMembershipSQL);
            }
            const response = await sendMessageAsUser(matrixUser, link.tube_room_id, message, {
                from: event.channel,
            });
            const result = await response.json();
            console.log(result);
        } else {
            const slackUserResponse = await fetch(`https://slack.com/api/users.profile.get?user=${event.user}`, {
                headers: {
                    Authorization: `Bearer ${bot_token}`,
                },
            });
            const slackUser = await slackUserResponse.json();
            const displayName =
                slackUser.profile.display_name || slackUser.profile.first_name + " " + slackUser.profile.last_name;
            const matrixUserResponse = await registerUser(displayName);
            const matrixUser = await matrixUserResponse.json();
            setDisplayName(matrixUser, displayName);
            await inviteAsSpacetubeRequest(matrixUser, link.tube_room_id);
            await join(matrixUser, link.tube_room_id);
            const insertTubeUserMembershipSQL = `INSERT INTO TubeUserRoomMemberships VALUES ('${user.tube_user_id}','${link.tube_room_id}');`;
            connection.run(insertTubeUserMembershipSQL);
            sendMessageAsUser(matrixUser, link.tube_room_id, message, {
                from: event.channel,
            });

            const insertUserSQL = `INSERT INTO UserTubeUserLinks VALUES ('${event.user}','${matrixUser.user_id}','${matrixUser.access_token}');`;
            connection.run(insertUserSQL);
        }
    });
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
        if (previousEvents.find((previousEvent) => previousEvent.event_ts === event.event_ts)) {
            return;
        } else {
            previousEvents.push(event);
        }

        if (challenge) return res.send(challenge);

        if (event.type === "app_mention") {
            console.log("slack event", event);
            handleMention(event);
        }
    });

    app.get("/api/slack/process/", async function (req, res) {
        const { slackCode } = req.query;
        const connection = await getDuckDBConnection();

        const data = new URLSearchParams();
        data.append("code", slackCode);
        data.append("client_id", SLACK_CLIENT_ID);
        data.append("client_secret", SLACK_SECRET);

        const slackResponse = await fetch("https://slack.com/api/oauth.v2.access", {
            method: "POST",
            body: data,
        });
        const slackResult = await slackResponse.json();

        if (slackResult.ok) {
            const {
                access_token,
                team: { id },
                bot_user_id,
            } = slackResult;

            const insertTeamBotTokenLink = `INSERT INTO SlackTeamBotTokenLinks VALUES ('${id}','${access_token}','${bot_user_id}');`;
            connection.run(insertTeamBotTokenLink);

            return res.send({ success: true });
        }

        return res.send({ success: false });
    });
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
            username,
        }),
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bot_token}`,
        },
    });
}
