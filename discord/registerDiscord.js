import 'dotenv/config';
import fetch from 'node-fetch';


// Simple test command
const ECHO_COMMAND = {
    name: 'echo',
    description: 'echo what has been sent',
    type: 1,
    options: [
        {
            name: "message",
            description: "what you want to repeat",
            type: 3,
            required: true
        }
    ]
};

const CREATE_COMMAND = {
    name: "create",
    description: "create a space-tube opening",
    type: 1,
    options: [
        {
            name: "group_name",
            description: "what you want your group to appear as",
            type: 3,
            required: true
        }
    ]
}

const CONNECT_COMMAND = {
    name: "connect",
    description: "connect to another space-tube opening",
    type: 1,
    options: [
        {
            name: "connection_code",
            description: "the other group's connection code",
            type: 3,
            required: true
        }
    ]
}
const SEND_COMMAND = {
    name: "send",
    description: "send a message through a space tube",
    type: 1,
    options: [
        {
            name: "message",
            description: "the text of what you want to send",
            type: 3,
            required: true
        }
    ]
}

const ALL_COMMANDS = [ECHO_COMMAND, CREATE_COMMAND, CONNECT_COMMAND, SEND_COMMAND];

export async function DiscordRequest(endpoint, options) {
    // append endpoint to root API URL
    const url = 'https://discord.com/api/v10/' + endpoint;
    // Stringify payloads
    if (options.body) options.body = JSON.stringify(options.body);
    // Use node-fetch to make requests
    const res = await fetch(url, {
        headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
        },
        ...options
    });
    // throw API errors
    if (!res.ok) {
        const data = await res.json();
        console.log(res.status);
        throw new Error(JSON.stringify(data));
    }
    // return original response
    return res;
}

async function InstallGlobalCommands(appId, commands) {
    // API endpoint to overwrite global commands
    const endpoint = `applications/${appId}/commands`;

    try {
        // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
        await DiscordRequest(endpoint, { method: 'PUT', body: commands });
    } catch (err) {
        console.error(err);
    }
}

InstallGlobalCommands(process.env.DISCORD_APP_ID, ALL_COMMANDS);