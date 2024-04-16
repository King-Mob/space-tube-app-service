import { sendMessage } from './matrixClientRequests.js';
import { registerTube, connectSameInstance, connectOtherInstance, getRoomName, handleTubeMessage } from './handler.js';
import { getItem, storeItem, getAllItemIncludes, getDisplayName } from '../storage.js';

const { HOME_SERVER } = process.env;

const echo = (event) => {
    const message = event.content.body;
    const newMessage = "you said: " + message.split("!spacetube echo")[1];

    sendMessage(event.room_id, newMessage);
}

const create = async (event) => {
    const tubeCode = await registerTube(event.room_id);

    sendMessage(event.room_id, "The code for this room is:");
    setTimeout(() => sendMessage(event.room_id, tubeCode), 500);
}

const connect = async (event) => {
    const message = event.content.body;
    const connectionCode = message.split("!spacetube connect")[1].trim();
    const spaceTubeInstance = connectionCode.split("~")[1];

    if (spaceTubeInstance === `@space-tube-bot:${HOME_SERVER}`) {
        await connectSameInstance(event, connectionCode);
        return;
    } else {
        await connectOtherInstance(event, connectionCode, spaceTubeInstance);
        return;
    }
}

const link = async (roomId, sender) => {
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

    const user = await getItem("userRoomId", roomId, "spacetube.user");

    if (!user) {
        const newTubeUserName = await getRoomName(roomId);

        const tubeIntermediary = await getItem("tubeIntermediary", roomId);

        await createTubeUser(
            newTubeUserName,
            roomId,
            tubeIntermediary
        );
    }

    const name = await getDisplayName(roomId, sender);

    sendMessage(
        roomId,
        `Use this link to view the room: https://spacetube.${HOME_SERVER}/?linkToken=${linkToken}&name=${name}`
    );

    return { homeServer: HOME_SERVER, linkToken };
};

const forward = async (event) => {
    /*
    const tubeOpen = await getItemIncludes("connectedRooms", event.room_id);

    if (tubeOpen) {
        await forwardToTubeIntermediary(tubeOpen.content.tubeIntermediary, event);
    }
    */

    const tubesOpen = await getAllItemIncludes("connectedRooms", event.room_id);

    if (tubesOpen) {
        handleTubeMessage(tubesOpen, event);
        return;
    }
};

const commands = {
    echo,
    create,
    connect,
    link,
    forward
}

export default commands;