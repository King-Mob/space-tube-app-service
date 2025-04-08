import {
    insertUserTubeUserLink,
    getTubeUserMembership,
    getTubeRoomLinkByChannelId,
    getInviteCodeByTubeId,
    insertChannelTubeRoomLink,
    insertChannelTeamLink,
    insertInviteTubeRoomLink,
    deleteChannelTubeRoomLinks,
    deleteChannelTeamLinks,
    getInviteTubeRoomLink,
    getTubeUserByUserId,
    insertTubeUserMembership,
    insertTeamBotTokenLink,
    getChannelTeamLink,
    getTeamBotTokenLink,
} from "../duckdb";
import xkpasswd from "xkpasswd";
import {
    sendMessageAsUser,
    registerUser,
    setDisplayName,
    inviteAsSpacetubeRequest,
    join,
    createRoom,
} from "../matrix/matrixClientRequests";
import { sendMessageAsMatrixUser } from "../matrix/handler";

const { SLACK_SECRET, SLACK_CLIENT_ID } = process.env;

function echo(event) {
    const message = event.text;
    const newMessage = "you said: " + message.split("!echo ")[1];

    sendSlackMessage(event.channel, newMessage, "spacetube");
}

async function create(event) {
    const existingChannelTubeRoomLink = await getTubeRoomLinkByChannelId(event.channel);

    if (existingChannelTubeRoomLink) {
        const existingInviteCode = await getInviteCodeByTubeId(existingChannelTubeRoomLink.tube_room_id);

        sendSlackMessage(
            event.channel,
            `Tube already open with invite code: ${existingInviteCode.invite_code}`,
            "spacetube"
        );
    } else {
        const createRoomResponse = await createRoom("tube room");
        const createRoomResult = await createRoomResponse.json();
        const tube_room_id = createRoomResult.room_id;

        const customInviteCode = event.text.split("!create ")[1];
        const inviteCode = customInviteCode || xkpasswd({ separators: "" });

        insertChannelTubeRoomLink(event.channel, "slack", tube_room_id);
        insertInviteTubeRoomLink(inviteCode, tube_room_id);

        await insertChannelTeamLink(event.channel, event.team);
        sendSlackMessage(event.channel, `Tube is open with invite code: ${inviteCode}`, "spacetube");
    }
}

async function connect(event) {
    deleteChannelTeamLinks(event.channel);
    await insertChannelTeamLink(event.channel, event.team);

    const inviteCode = event.text.split("!connect ")[1];

    const { tube_room_id } = await getInviteTubeRoomLink(inviteCode);

    if (tube_room_id) {
        deleteChannelTubeRoomLinks(event.channel);

        insertChannelTubeRoomLink(event.channel, "slack", tube_room_id);
        sendSlackMessage(event.channel, "You have joined the spacetube!", "spacetube");
    } else {
        sendSlackMessage(event.channel, "No tube found for that invite code", "spacetube");
    }
}

async function forward(event) {
    const link = await getTubeRoomLinkByChannelId(event.channel);

    if (!link) return;

    const user = await getTubeUserByUserId(event.user);

    const { bot_user_id } = await getBot(event.channel);
    const message = event.text.replace(`<@${bot_user_id}>`, "");

    console.log("user", user);
    console.log("link", link);

    if (user) {
        const matrixUser = {
            user_id: user.tube_user_id,
            access_token: user.tube_user_access_token,
        };

        const response = await sendMessageAsMatrixUser(matrixUser, message, link.tube_room_id, {
            from: event.channel,
        });
        const result = await response.json();
        console.log(result);
    } else {
        const displayName = await getSlackDisplayName(event.channel, event.user);
        const matrixUserResponse = await registerUser(displayName);
        const matrixUser = await matrixUserResponse.json();
        setDisplayName(matrixUser, displayName);

        sendMessageAsMatrixUser(matrixUser, message, link.tube_room_id, {
            from: event.channel,
        });

        insertUserTubeUserLink(event.user, matrixUser);
    }
}

function handleMention(event) {
    if (event.text.includes("!echo")) {
        echo(event);
        return;
    }

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

            insertTeamBotTokenLink(id, access_token, bot_user_id);

            return res.send({ success: true });
        }

        return res.send({ success: false });
    });
}

async function getBot(channelId: string) {
    const { team_id } = await getChannelTeamLink(channelId);
    const { bot_token, bot_user_id } = await getTeamBotTokenLink(team_id);

    return { bot_token, bot_user_id, team_id };
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

async function getSlackDisplayName(channelId, userId) {
    console.log("get name");

    const { bot_token, team_id } = await getBot(channelId);
    console.log(bot_token);

    const slackUserResponse = await fetch(`https://slack.com/api/users.profile.get?user=${userId}`, {
        headers: {
            Authorization: `Bearer ${bot_token}`,
        },
    });
    const slackUser = await slackUserResponse.json();
    const userName = slackUser.profile.display_name || slackUser.profile.first_name + " " + slackUser.profile.last_name;

    const slackTeamResponse = await fetch(`https://slack.com/api/team.info?team=${team_id}`);
    const slackTeam = await slackTeamResponse.json();

    return `${userName}.${slackTeam.name}`;
}
