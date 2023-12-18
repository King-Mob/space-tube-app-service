import "dotenv/config";
import { DiscordRequest } from "./index.js";

const ECHO_COMMAND = {
  name: "echo",
  description: "echo what has been sent",
  type: 1,
  options: [
    {
      name: "message",
      description: "what you want to repeat",
      type: 3,
      required: true,
    },
  ],
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
      required: true,
    },
  ],
};

const CONNECT_COMMAND = {
  name: "connect",
  description: "connect to another space-tube opening",
  type: 1,
  options: [
    {
      name: "connection_code",
      description: "the other group's connection code",
      type: 3,
      required: true,
    },
  ],
};
const SEND_COMMAND = {
  name: "send",
  description: "send a message through a space tube",
  type: 1,
  options: [
    {
      name: "message",
      description: "the text of what you want to send",
      type: 3,
      required: true,
    },
  ],
};
const LINK_COMMAND = {
  name: "link",
  description: "get a link to view your spacetube",
  type: 1,
  options: [{
    name: "message",
    description: "what you want to repeat",
    type: 3,
    required: true,
  },],
};

const ECHO_SECOND_COMMAND = {
  name: "echosecondx",
  description: "echo what has been sent",
  type: 1,
  options: [
    {
      name: "message",
      description: "what you want to repeat",
      type: 3,
      required: true,
    },
  ],
};


const ALL_COMMANDS = [
  ECHO_COMMAND,
  CREATE_COMMAND,
  CONNECT_COMMAND,
  SEND_COMMAND,
  LINK_COMMAND,
  ECHO_SECOND_COMMAND
];

async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: "PUT", body: commands });
  } catch (err) {
    console.error(err);
  }
}

InstallGlobalCommands(process.env.DISCORD_APP_ID, ALL_COMMANDS);
