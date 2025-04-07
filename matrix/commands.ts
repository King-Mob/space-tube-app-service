import {
    sendMessage,
    sendMessageAsUser,
    registerUser,
    setDisplayName,
    inviteAsSpacetubeRequest,
    join,
} from "./matrixClientRequests.js";
import { registerTube, connectSameInstance, connectOtherInstance, extractMessage } from "./handler.js";
import { getItem, storeItem, getDisplayName } from "./storage.js";
import {
    getTubeRoomLinkByChannelId,
    getTubeUserByUserId,
    getTubeUserMembership,
    insertUserTubeUserLink,
} from "../duckdb.js";
import { v4 as uuidv4 } from "uuid";

const { HOME_SERVER } = process.env;

const echo = (event) => {
    const message = event.content.body;
    const newMessage = "you said: " + message.split("!spacetube echo")[1];

    sendMessage(event.room_id, newMessage);
};

const create = async (event) => {
    const tubeCode = await registerTube(event.room_id);

    sendMessage(event.room_id, "The code for this room is:");
    setTimeout(() => sendMessage(event.room_id, tubeCode), 500);
};

const connect = async (event) => {
    const message = event.content.body;
    const connectionCode = message.split("!spacetube connect")[1].trim();
    const spaceTubeInstance = connectionCode.split("~")[1];

    if (spaceTubeInstance === `@spacetube_bot:${HOME_SERVER}`) {
        await connectSameInstance(event, connectionCode);
        return;
    } else {
        await connectOtherInstance(event, connectionCode, spaceTubeInstance);
        return;
    }
};

const link = async (roomId: string, name: string, groupUser = null) => {
    let linkEvent = await getItem("roomId", roomId, "spacetube.link");
    let linkToken;
    if (!linkEvent) {
        const newLinkToken = uuidv4();
        await storeItem({
            type: "spacetube.link",
            linkToken: newLinkToken,
            roomId: roomId,
        });
        linkToken = newLinkToken;
    } else {
        linkToken = linkEvent.content.linkToken;
    }

    const linkMessage = `Use this link to view the room: https://spacetube.${HOME_SERVER}/?linkToken=${linkToken}&name=${name}`;

    if (groupUser) {
        sendMessageAsUser(groupUser, roomId, linkMessage);
    } else {
        sendMessage(roomId, linkMessage);
    }

    return { homeServer: HOME_SERVER, linkToken };
};

const forward = async (event) => {
    const link = await getTubeRoomLinkByChannelId(event.room_id);

    if (!link) return;

    const user = await getTubeUserByUserId(event.sender);

    const message = extractMessage(event.content.formatted_body);

    if (user) {
        const matrixUser = {
            user_id: user.tube_user_id,
            access_token: user.tube_user_access_token,
        };
        const tubeUserMembership = await getTubeUserMembership(user.tube_user_id, link.tube_room_id);

        if (!tubeUserMembership) {
        }

        sendMessageAsUser(matrixUser, link.tube_room_id, message, {
            from: event.room_id,
        });
    } else {
        const displayName = await getDisplayName(event.room_id, event.sender);
        const matrixUserResponse = await registerUser(displayName);
        const matrixUser = await matrixUserResponse.json();
        setDisplayName(matrixUser, displayName);
        await inviteAsSpacetubeRequest(matrixUser, link.tube_room_id);
        await join(matrixUser, link.tube_room_id);
        sendMessageAsUser(matrixUser, link.tube_room_id, message, {
            from: event.room_id,
        });

        insertUserTubeUserLink(event.sender, matrixUser);
    }

    return;
};

const commands = {
    echo,
    create,
    connect,
    link,
    forward,
};

export default commands;
