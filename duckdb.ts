import { existsSync } from 'node:fs';
import { DuckDBInstance } from '@duckdb/node-api';

let connection;

export async function startDuckDB() {
    const spacetubeDuckDBFileName = "spacetube_duckdb.db"

    const duckDBInitiated = existsSync(spacetubeDuckDBFileName);
    const instance = await DuckDBInstance.create(spacetubeDuckDBFileName);
    connection = await instance.connect();

    if (!duckDBInitiated) {
        const createChannelTubeRoomLinks = "CREATE TABLE ChannelTubeRoomLinks (channel_id VARCHAR, channel_type VARCHAR, tube_room_id VARCHAR);"
        await connection.run(createChannelTubeRoomLinks);

        const createUserTubeUserLinks = "CREATE TABLE UserTubeUserLinks (user_id VARCHAR, tube_user_id VARCHAR, tube_user_access_token VARCHAR);";
        await connection.run(createUserTubeUserLinks);

        const insertFirstLink = "INSERT INTO ChannelTubeRoomLinks VALUES ('C08LV6R3UF7', 'slack', '!MPYlXGrdptSscBRvAb:spacetu.be');"
        await connection.run(insertFirstLink)
    }

    return connection;
}

export async function getDuckDBConnection() {
    return connection;
}