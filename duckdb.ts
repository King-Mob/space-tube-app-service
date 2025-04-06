import { existsSync } from 'node:fs';
import { DuckDBInstance } from '@duckdb/node-api';

let connection;
const { SLACK_TOKEN } = process.env;

export async function startDuckDB() {
    const spacetubeDuckDBFileName = "spacetube_duckdb.db"

    const duckDBInitiated = existsSync(spacetubeDuckDBFileName);
    const instance = await DuckDBInstance.create(spacetubeDuckDBFileName);
    connection = await instance.connect();

    if (!duckDBInitiated) {
        const createChannelTubeRoomLinks = "CREATE TABLE ChannelTubeRoomLinks (channel_id VARCHAR, channel_type VARCHAR, tube_room_id VARCHAR);"
        await connection.run(createChannelTubeRoomLinks);

        const insertFirstLink = "INSERT INTO ChannelTubeRoomLinks VALUES ('C08LV6R3UF7', 'slack', '!MPYlXGrdptSscBRvAb:spacetu.be');"
        await connection.run(insertFirstLink);

        const insertSecondLink = "INSERT INTO ChannelTubeRoomLinks VALUES ('!tfHSOJOhSOJwHiFolz:spacetu.be', 'matrix', '!MPYlXGrdptSscBRvAb:spacetu.be'); "
        await connection.run(insertSecondLink);

        const createTubeUserRoomMemberships = "CREATE TABLE TubeUserRoomMemberships (tube_user_id VARCHAR, room_id VARCHAR);";
        await connection.run(createTubeUserRoomMemberships);

        const createUserTubeUserLinks = "CREATE TABLE UserTubeUserLinks (user_id VARCHAR, tube_user_id VARCHAR, tube_user_access_token VARCHAR);";
        await connection.run(createUserTubeUserLinks);

        const createSlackChannelTeamLinks = "CREATE TABLE SlackChannelTeamLinks (channel_id VARCHAR, team_id VARCHAR);";
        await connection.run(createSlackChannelTeamLinks);

        const insertSCTL = "INSERT INTO SlackChannelTeamLinks VALUES ('C08LV6R3UF7','T04CRH1BXU6');";
        await connection.run(insertSCTL);

        const createSlackTeamBotTokenLinks = "CREATE TABLE SlackTeamBotTokenLinks (team_id VARCHAR, bot_token VARCHAR);";
        await connection.run(createSlackTeamBotTokenLinks);

        const insertSTBTL = `INSERt INTO SlackTeamBotTokenLinks VALUES ('T04CRH1BXU6','${SLACK_TOKEN}')`;
        await connection.run(insertSTBTL);

        console.log("duckdb initiated")
    }

    return connection;
}

export async function getDuckDBConnection() {
    return connection;
}