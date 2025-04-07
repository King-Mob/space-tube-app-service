import { existsSync } from "node:fs";
import { DuckDBInstance } from "@duckdb/node-api";

let connection;
const { SLACK_TOKEN, SLACK_CHANNEL, SLACK_TEAM, SLACK_BOT_USER_ID, TEST_INVITE_CODE } = process.env;

export async function startDuckDB() {
    const spacetubeDuckDBFileName = "spacetube_duckdb.db";

    const duckDBInitiated = existsSync(spacetubeDuckDBFileName);
    const instance = await DuckDBInstance.create(spacetubeDuckDBFileName);
    connection = await instance.connect();

    if (!duckDBInitiated) {
        const createChannelTubeRoomLinks =
            "CREATE TABLE ChannelTubeRoomLinks (channel_id VARCHAR, channel_type VARCHAR, tube_room_id VARCHAR);";
        await connection.run(createChannelTubeRoomLinks);

        const insertFirstLink = `INSERT INTO ChannelTubeRoomLinks VALUES ('${SLACK_CHANNEL}', 'slack', '!MPYlXGrdptSscBRvAb:spacetu.be');`;
        await connection.run(insertFirstLink);

        const insertSecondLink =
            "INSERT INTO ChannelTubeRoomLinks VALUES ('!tfHSOJOhSOJwHiFolz:spacetu.be', 'matrix', '!MPYlXGrdptSscBRvAb:spacetu.be'); ";
        await connection.run(insertSecondLink);

        const createTubeUserRoomMemberships =
            "CREATE TABLE TubeUserRoomMemberships (tube_user_id VARCHAR, room_id VARCHAR);";
        await connection.run(createTubeUserRoomMemberships);

        const createUserTubeUserLinks =
            "CREATE TABLE UserTubeUserLinks (user_id VARCHAR, tube_user_id VARCHAR, tube_user_access_token VARCHAR);";
        await connection.run(createUserTubeUserLinks);

        const createSlackChannelTeamLinks = "CREATE TABLE SlackChannelTeamLinks (channel_id VARCHAR, team_id VARCHAR);";
        await connection.run(createSlackChannelTeamLinks);

        const insertSCTL = `INSERT INTO SlackChannelTeamLinks VALUES ('${SLACK_CHANNEL}','${SLACK_TEAM}');`;
        await connection.run(insertSCTL);

        const createSlackTeamBotTokenLinks =
            "CREATE TABLE SlackTeamBotTokenLinks (team_id VARCHAR, bot_token VARCHAR, bot_user_id VARCHAR);";
        await connection.run(createSlackTeamBotTokenLinks);

        const insertSTBTL = `INSERT INTO SlackTeamBotTokenLinks VALUES ('${SLACK_TEAM}','${SLACK_TOKEN}','${SLACK_BOT_USER_ID}')`;
        await connection.run(insertSTBTL);

        const createInviteTubeRoomLinks =
            "CREATE TABLE InviteTubeRoomLinks (invite_code VARCHAR, tube_room_id VARCHAR);";
        await connection.run(createInviteTubeRoomLinks);

        const insertInviteTubeRoomLink = `INSERT INTO InviteTubeRoomLinks VALUES ('${TEST_INVITE_CODE}','!MPYlXGrdptSscBRvAb:spacetu.be');`;
        await connection.run(insertInviteTubeRoomLink);

        console.log("duckdb initiated");
    }

    return connection;
}

export async function getDuckDBConnection() {
    return connection;
}

export async function getInviteCodeByTubeId(tubeRoomId) {
    const getExistingInviteCode = `SELECT * FROM InviteTubeRoomLinks WHERE tube_room_id='${tubeRoomId}';`;
    const existingInviteCodeRows = await connection.run(getExistingInviteCode);
    const existingInviteCodes = await existingInviteCodeRows.getRowObjects();
    const existingInviteCode = existingInviteCodes[0];
    return existingInviteCode;
}

export async function getTubeRoomLinksByTubeId(tubeRoomId) {
    const tubeRoomLinksSQL = `SELECT * FROM ChannelTubeRoomLinks WHERE tube_room_id='${tubeRoomId}'`;

    const tubeRoomLinkRows = await connection.run(tubeRoomLinksSQL);
    const tubeRoomLinks = await tubeRoomLinkRows.getRowObjects();

    return tubeRoomLinks;
}

export async function getTubeRoomLinkByChannelId(channelId) {
    const linkRows = await connection.run(`SELECT * FROM ChannelTubeRoomLinks WHERE channel_id='${channelId}';`);
    const links = await linkRows.getRowObjects();
    const link = links[0];
    return link;
}

export async function insertChannelTubeRoomLink(channelId, tubeRoomId) {
    const insertChannelTubeRoomLink = `INSERT INTO ChannelTubeRoomLinks VALUES ('${channelId}', 'slack', '${tubeRoomId}');`;
    await connection.run(insertChannelTubeRoomLink);
}

export async function deleteChannelTubeRoomLinks(channelId) {
    const deleteChannelTubeRoomLinks = `DELETE FROM ChannelTubeRoomLinks WHERE channel_id='${channelId}';`;
    await connection.run(deleteChannelTubeRoomLinks);
}

export async function insertChannelTeamLink(channelId, teamId) {
    const insertChannelTeamLink = `INSERT INTO SlackChannelTeamLinks VALUES ('${channelId}','${teamId}');`;
    await connection.run(insertChannelTeamLink);
}

export async function getChannelTeamLink(channelId) {
    const getChannelTeamLinksSQL = `SELECT * FROM SlackChannelTeamLinks WHERE channel_id='${channelId}';`;
    const channelTeamLinkRows = await connection.run(getChannelTeamLinksSQL);
    const channelTeamLinks = await channelTeamLinkRows.getRowObjects();
    const channelTeamLink = channelTeamLinks[0];
    return channelTeamLink;
}

export async function deleteChannelTeamLinks(channelId) {
    const deleteChannelTeamLinks = `DELETE FROM SlackChannelTeamLinks WHERE channel_id='${channelId}';`;
    await connection.run(deleteChannelTeamLinks);
}

export async function insertInviteTubeRoomLink(inviteCode, tubeRoomId) {
    const insertInviteTubeRoomLink = `INSERT INTO InviteTubeRoomLinks VALUES ('${inviteCode}','${tubeRoomId}');`;
    await connection.run(insertInviteTubeRoomLink);
}

export async function getInviteTubeRoomLink(inviteCode) {
    const getInviteTubeRoomLinkSQL = `SELECT * FROM InviteTubeRoomLinks WHERE invite_code='${inviteCode}';`;
    const inviteTubeRoomsLinkRows = await connection.run(getInviteTubeRoomLinkSQL);
    const inviteTubeRoomsLinks = await inviteTubeRoomsLinkRows.getRowObjects();
    const inviteTubeRoomLink = inviteTubeRoomsLinks[0];
    return inviteTubeRoomLink;
}

export async function insertUserTubeUserLink(user, tubeUser) {
    const insertUserSQL = `INSERT INTO UserTubeUserLinks VALUES ('${user}','${tubeUser.user_id}','${tubeUser.access_token}');`;
    connection.run(insertUserSQL);
}

export async function getTubeUserMembership(tubeUserId, tubeRoomId) {
    const tubeUserMembershipSQL = `SELECT * FROM TubeUserRoomMemberships WHERE tube_user_id='${tubeUserId}' AND room_id='${tubeRoomId}';`;
    const tubeUserMembershipRows = await connection.run(tubeUserMembershipSQL);
    const tubeUserMemberships = await tubeUserMembershipRows.getRowObjects();
    const tubeUserMembership = tubeUserMemberships[0];
    return tubeUserMembership;
}

export async function insertTubeUserMembership(userId, roomId) {
    const insertTubeUserMembershipSQL = `INSERT INTO TubeUserRoomMemberships VALUES ('${userId}','${roomId}');`;
    connection.run(insertTubeUserMembershipSQL);
}

export async function getTubeUserByTubeUserId(tubeUserId) {
    const getTubeUserSQL = `SELECT * FROM UserTubeUserLinks WHERE tube_user_id='${tubeUserId}';`;
    const tubeUserRows = await connection.run(getTubeUserSQL);
    const tubeUsers = await tubeUserRows.getRowObjects();
    const tubeUser = tubeUsers[0];
    return tubeUser;
}

export async function getTubeUserByUserId(userId) {
    const userRows = await connection.run(`SELECT * FROM UserTubeUserLinks WHERE user_id='${userId}'`);
    const users = await userRows.getRowObjects();
    const user = users[0];
    return user;
}

export async function insertTeamBotTokenLink(teamId, botToken, botUserId) {
    const insertTeamBotTokenLink = `INSERT INTO SlackTeamBotTokenLinks VALUES ('${teamId}','${botToken}','${botUserId}');`;
    connection.run(insertTeamBotTokenLink);
}

export async function getTeamBotTokenLink(teamId) {
    const getBotTokenSQL = `SELECT * FROM SlackTeamBotTokenLinks WHERE team_id='${teamId}';`;
    const teamBotTokenLinkRows = await connection.run(getBotTokenSQL);
    const teamBotTokenLinks = await teamBotTokenLinkRows.getRowObjects();
    const teamBotTokenLink = teamBotTokenLinks[0];
    return teamBotTokenLink;
}
