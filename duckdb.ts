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

export async function getTubeRoomLinks(tubeRoomId) {
    const tubeRoomLinksSQL = `SELECT * FROM ChannelTubeRoomLinks WHERE tube_room_id='${tubeRoomId}'`;

    const tubeRoomLinkRows = await connection.run(tubeRoomLinksSQL);
    const tubeRoomLinks = await tubeRoomLinkRows.getRowObjects();

    return tubeRoomLinks;
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

export async function getTubeUser(userId) {
    const getTubeUserSQL = `SELECT * FROM UserTubeUserLinks WHERE tube_user_id='${userId}';`;
    const tubeUserRows = await connection.run(getTubeUserSQL);
    const tubeUsers = await tubeUserRows.getRowObjects();
    const tubeUser = tubeUsers[0];
    return tubeUser;
}
