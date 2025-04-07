import {
    sendMessage,
    sendMessageAsUser,
    registerUser,
    setDisplayName,
    inviteAsSpacetubeRequest,
    join,
    createRoom,
} from "./matrixClientRequests.js";
import { connectSameInstance, connectOtherInstance, extractMessage } from "./handler.js";
import { getItem, storeItem, getDisplayName } from "./storage.js";
import {
    getTubeRoomLinkByChannelId,
    getTubeUserByUserId,
    getTubeUserMembership,
    insertUserTubeUserLink,
    insertTubeUserMembership,
    getInviteCodeByTubeId,
    insertChannelTubeRoomLink,
    insertInviteTubeRoomLink,
} from "../duckdb.js";
import { v4 as uuidv4 } from "uuid";
import { xkpasswd } from "xkpasswd";

const { HOME_SERVER } = process.env;

const echo = (event) => {
    const message = event.content.body;
    const newMessage = "you said: " + message.split("!spacetube echo")[1];

    sendMessage(event.room_id, newMessage);
};

const create = async (event) => {
    const existingChannelTubeRoomLink = await getTubeRoomLinkByChannelId(event.room_id);

    if (existingChannelTubeRoomLink) {
        const existingInviteCode = await getInviteCodeByTubeId(existingChannelTubeRoomLink.tube_room_id);

        sendMessage(
            event.room_id,
            `Tube already open with invite code: ${existingInviteCode.invite_code}`,
            "spacetube"
        );
    } else {
        const createRoomResponse = await createRoom("tube room");
        const createRoomResult = await createRoomResponse.json();
        const tube_room_id = createRoomResult.room_id;

        const customInviteCode = event.text.split("!create ")[1];
        const inviteCode = customInviteCode || xkpasswd({ separators: "" });

        insertChannelTubeRoomLink(event.room_id, tube_room_id);
        insertInviteTubeRoomLink(inviteCode, tube_room_id);
        sendMessage(event.room_id, `Tube is open with invite code: ${inviteCode}`);
    }
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
            await inviteAsSpacetubeRequest(matrixUser, link.tube_room_id);
            await join(matrixUser, link.tube_room_id);
            insertTubeUserMembership(user.tube_user_id, link.tube_room_id);
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
};

const commands = {
    echo,
    create,
    connect,
    link,
    forward,
};

export default commands;
