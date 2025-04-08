import {
    sendMessage,
    sendMessageAsUser,
    registerUser,
    setDisplayName,
    createRoom,
    getProfile,
    setProfilePicture,
} from "./matrixClientRequests.js";
import { extractMessage, sendMessageAsMatrixUser } from "./handler.js";
import { getItem, storeItem, getDisplayName } from "./storage.js";
import {
    getTubeRoomLinkByChannelId,
    getTubeUserByUserId,
    insertUserTubeUserLink,
    getInviteCodeByTubeId,
    insertChannelTubeRoomLink,
    insertInviteTubeRoomLink,
    getInviteTubeRoomLink,
    deleteChannelTubeRoomLinks,
} from "../duckdb.js";
import { v4 as uuidv4 } from "uuid";
import xkpasswd from "xkpasswd";

const { HOME_SERVER } = process.env;

const echo = (event) => {
    const message = event.content.body;
    const newMessage = "you said: " + message.split("!echo ")[1];

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

        const customInviteCode = event.content.formatted_body.split("!create ")[1];
        const inviteCode = customInviteCode || xkpasswd({ separators: "" });

        insertChannelTubeRoomLink(event.room_id, "matrix", tube_room_id);
        insertInviteTubeRoomLink(inviteCode, tube_room_id);
        sendMessage(event.room_id, `Tube is open with invite code: ${inviteCode}`);
    }
};

const connect = async (event) => {
    const message = extractMessage(event.content.formatted_body);
    const inviteCode = message.split("!connect ")[1];

    const { tube_room_id } = await getInviteTubeRoomLink(inviteCode);

    if (tube_room_id) {
        deleteChannelTubeRoomLinks(event.room_id);

        insertChannelTubeRoomLink(event.room_id, "matrix", tube_room_id);

        sendMessage(event.room_id, "You have joined the spacetube!");
    } else {
        sendMessage(event.room_id, "No tube found for that invite code");
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

        sendMessageAsMatrixUser(matrixUser, message, link.tube_room_id, {
            from: event.room_id,
        });
    } else {
        const profileResponse = await getProfile(event.sender);
        const { displayname, avatar_url } = await profileResponse.json();
        const matrixUserResponse = await registerUser(displayname);
        const matrixUser = await matrixUserResponse.json();
        setDisplayName(matrixUser, displayname);
        if (avatar_url) setProfilePicture(matrixUser, avatar_url);

        sendMessageAsMatrixUser(matrixUser, message, link.tube_room_id, {
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
