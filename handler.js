import fetch from 'node-fetch';
import { storeItem, getItem, getItemIncludes, getItemShared, storeItemShared, getDisplayName } from "./storage.js";
import { v4 as uuidv4 } from 'uuid';

const { HOME_SERVER, APPLICATION_TOKEN } = process.env;

const sendMessage = (roomId, message) => {
    return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/send/m.room.message?user_id=@space-tube-bot:${HOME_SERVER}`, {
        method: 'POST',
        body: JSON.stringify({
            body: message,
            msgtype: "m.text"
        }),
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    })
}

const sendMessageAsUser = (user, roomId, message) => {
    return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/send/m.room.message`, {
        method: 'POST',
        body: JSON.stringify({
            body: message,
            msgtype: "m.text"
        }),
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${user.access_token}`
        }
    })
}

const createRoom = () => {
    return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/createRoom?user_id=@space-tube-bot:${HOME_SERVER}`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    })
}

const getRoomState = (roomId) => {
    return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/state`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    })
}

const registerUser = (userId) => {
    return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/register`, {
        method: 'POST',
        body: JSON.stringify({
            type: "m.login.application_service",
            username: `_space-tube-${userId}-${uuidv4()}`
        }),
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    })
}

const setDisplayName = (user, displayName) => {
    return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/profile/${user.user_id}/displayname`, {
        method: 'PUT',
        body: JSON.stringify({
            displayname: displayName
        }),
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${user.access_token}`
        }
    })
}

const invite = (user, roomId) => {
    return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/invite?user_id=@space-tube-bot:${HOME_SERVER}`, {
        method: 'POST',
        body: JSON.stringify({
            user_id: user.user_id
        }),
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    })
}

const join = (user, roomId) => {
    return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/join/${roomId}`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${user.access_token}`
        }
    })
}

const connectSameInstance = async (event, connectionCode) => {
    const otherTube = await getItem("tubeCode", connectionCode);

    if (!otherTube) {
        return;
    }

    const otherRoomId = otherTube.content.name.split("registration-")[1];

    if (otherRoomId === event.room_id) {
        sendMessage(event.room_id, "That's the code for this tube opening.");
        return;
    }

    const connection = `connection-${event.room_id}-${otherRoomId}`;

    const tubeConnection = await getItem("name", connection);

    if (!tubeConnection) {
        storeItem({ name: connection, type: "spacetube.connect" });
    }

    const otherConnection = `connection-${otherRoomId}-${event.room_id}`;

    const otherTubeConnection = await getItem("name", otherConnection);

    if (otherTubeConnection) {
        const connectedRooms = [event.room_id, otherRoomId].sort();
        const tubeName = `open-${connectedRooms[0]}-${connectedRooms[1]}`;

        const existingTube = await getItem("name", tubeName);

        if (existingTube) {
            sendMessage(event.room_id, "This tube is already active.");
        }
        else {
            const tubeRoomResponse = await createRoom();
            const tubeRoom = await tubeRoomResponse.json();
            console.log(tubeRoom);
            storeItem({
                name: tubeName,
                type: "spacetube.open",
                tubeIntermediary: tubeRoom.room_id,
                connectedRooms
            });
            sendMessage(event.room_id, "I declare this tube is now open!");
            sendMessage(otherRoomId, "I declare this tube is now open!");
        }
    }
    else {
        sendMessage(event.room_id, "Received connection, waiting for other group to connect.");
    }

    return;
}

const connectOtherInstance = async (event, remoteConnectionCode, otherInstance) => {
    console.log("connecting to other instance")

    const sharedTubeManagementItem = await getItem("sharedWithInstance", otherInstance);

    let sharedTubeManagementRoom;

    if (sharedTubeManagementItem) {
        console.log("shared room exists")
        sharedTubeManagementRoom = sharedTubeManagementItem.content.roomId;
    }
    else {
        console.log("creating shared room");
        const createRoomResponse = await createRoom();
        const createdRoom = await createRoomResponse.json();
        sharedTubeManagementRoom = createdRoom.room_id;

        await invite({ user_id: otherInstance }, sharedTubeManagementRoom);
        await storeItem({
            type: "spacetube.shared.management",
            sharedWithInstance: otherInstance,
            roomId: sharedTubeManagementRoom
        });
    }

    console.log("shared management room", sharedTubeManagementRoom)

    const tubeOpening = await getItem("name", `registration-${event.room_id}`);
    const localConnectionCode = tubeOpening.content.tubeCode;

    const localConnection = `connection-${localConnectionCode}-${remoteConnectionCode}`;
    const tubeConnection = await getItemShared(sharedTubeManagementRoom, "name", localConnection);
    if (!tubeConnection) {
        console.log("storing local connection")
        storeItemShared(sharedTubeManagementRoom, { name: localConnection, type: "spacetube.connect" });
    }

    const remoteConnection = await getItemShared(sharedTubeManagementRoom, "name", `connection-${remoteConnectionCode}-${localConnectionCode}`);

    if (remoteConnection) {
        //to get to here, both rooms have passed !space-tube connect
        console.log("this room should be connected");

        const connectionCodes = [localConnectionCode, remoteConnectionCode].sort();
        const tubeName = `open-${connectionCodes[0]}~${connectionCodes[1]}`;

        const existingTube = await getItem("name", tubeName);

        if (existingTube) {
            sendMessage(event.room_id, "This tube is already active.");
        }
        else {
            const createRoomResponse = await createRoom();
            const createdRoom = await createRoomResponse.json();

            await invite({ user_id: otherInstance }, createdRoom.room_id);

            storeItem({
                name: tubeName,
                type: "spacetube.open",
                tubeIntermediary: createdRoom.room_id,
                connectedRooms: [event.room_id]
            });
            storeItemShared(sharedTubeManagementRoom, {
                name: tubeName,
                type: "spacetube.remote.open",
                tubeIntermediary: createdRoom.room_id,
                connectionCode: remoteConnectionCode
            })

            sendMessage(event.room_id, "I declare this tube open!");
        }

    }
    else {
        sendMessage(event.room_id, "Received connection, waiting for other group to connect.");
    }
}

// on receipt of tubeOpen in shared management room, store tubeOpen in own room.
export const handleRemoteOpen = async (event) => {
    if (event.sender !== `@space-tube-bot:${HOME_SERVER}`) {

        const { connectionCode } = event.content;

        const tubeOpening = await getItem("tubeCode", connectionCode);

        const localTubeOpening = tubeOpening.content.roomId;

        console.log(connectionCode, tubeOpening, localTubeOpening);

        storeItem({
            name: event.content.name,
            type: "spacetube.open",
            tubeIntermediary: event.content.tubeIntermediary,
            connectedRooms: [localTubeOpening]
        })

        sendMessage(localTubeOpening, "I declare this tube open!");
    }
}

const handleMessageLocalTube = async (tubeIntermediary, event, message) => {
    const { content: { user: user, userRoomId, name } } = await getItem("userId", event.sender);

    sendMessageAsUser(user, userRoomId, message);

    const clone = await getItem("originalUserId", event.sender);

    let cloneUser;

    if (clone) {
        cloneUser = clone.content.clone;
    }
    else {
        const newCloneUserResponse = await registerUser(name);
        const newCloneUser = await newCloneUserResponse.json();

        const cloneUserRoomId = tubeIntermediary.content.connectedRooms.find(roomId => roomId !== userRoomId);

        cloneUser = newCloneUser;
        cloneUser.roomId = cloneUserRoomId;

        storeItem({
            type: "spacetube.user.clone",
            clone: cloneUser,
            originalUserId: user.user_id,
        });

        setDisplayName(cloneUser, name);

        await invite(cloneUser, cloneUser.roomId);
        await join(cloneUser, cloneUser.roomId);
    }

    sendMessageAsUser(cloneUser, cloneUser.roomId, message);
}

const handleMessageRemoteTube = async (tubeIntermediary, event, message) => {
    console.log("message from remote tube")
    console.log(tubeIntermediary);
    console.log(event);
    console.log(message);

    const { content: { user: user, userRoomId } } = await getItem("userId", event.sender);

    if (user) {
        sendMessageAsUser(user, userRoomId, message);
    }
    else {
        const clone = await getItem("originalUserId", event.sender);

        let cloneUser;

        if (clone) {
            cloneUser = clone.content.clone;
        }
        else {
            const cloneName = await getDisplayName(event.room_id, event.sender);
            console.log(cloneName)
            const newCloneUserResponse = await registerUser(cloneName);
            const newCloneUser = await newCloneUserResponse.json();
            console.log(newCloneUser);

            const cloneUserRoomId = tubeIntermediary.content.connectedRooms[0];

            cloneUser = newCloneUser;
            cloneUser.roomId = cloneUserRoomId;

            storeItem({
                type: "spacetube.user.clone",
                clone: cloneUser,
                originalUserId: event.sender,
            });

            setDisplayName(cloneUser, cloneName);

            await invite(cloneUser, cloneUser.roomId);
            await join(cloneUser, cloneUser.roomId);
        }

        sendMessageAsUser(cloneUser, cloneUser.roomId, message);
    }
}

export const handleMessage = async (event) => {
    //for now, if the sender of the event is our instance, do nothing
    if (event.sender === `@space-tube-bot:${HOME_SERVER}`)
        return;

    const message = event.content.body;

    if (message.includes("!space-tube echo")) {
        const newMessage = "you said: " + message.split("!space-tube echo")[1];

        sendMessage(event.room_id, newMessage);
    }

    if (message.includes("!space-tube create")) {
        const tubeOpening = await getItem("name", `registration-${event.room_id}`);

        const tubeCode = tubeOpening ? tubeOpening.content.tubeCode : `${uuidv4()}~@space-tube-bot:${HOME_SERVER}`;

        if (!tubeOpening) {
            storeItem({ name: `registration-${event.room_id}`, type: "spacetube.create", tubeCode, roomId: event.room_id }).catch(err => console.log(err))
        }

        sendMessage(event.room_id, `The code for this room is ${tubeCode}`);

        return;
    }

    if (message.includes("!space-tube connect")) {
        const connectionCode = message.split("!space-tube connect")[1].trim();
        const spaceTubeInstance = connectionCode.split("~")[1];

        if (spaceTubeInstance === `@space-tube-bot:${HOME_SERVER}`) {
            await connectSameInstance(event, connectionCode);
            return;
        }
        else {
            await connectOtherInstance(event, connectionCode, spaceTubeInstance);
            return;
        }
    }

    const tubeIntermediary = await getItem("tubeIntermediary", event.room_id);

    if (tubeIntermediary) {
        console.log("message in tube intermediary");

        const tubeName = tubeIntermediary.content.name;

        //later when we use connection codes throughout, test if the instances are the same
        if (tubeName.includes("~")) {
            handleMessageRemoteTube(tubeIntermediary, event, message);
            return;
        }
        else {
            handleMessageLocalTube(tubeIntermediary, event, message);
            return;
        }
    }

    const tubeOpen = await getItemIncludes("connectedRooms", event.room_id);

    if (tubeOpen) {
        console.log("there was a message in an open tube");

        if (event.sender.includes("@_space-tube"))
            return;

        const { tubeIntermediary } = tubeOpen.content;

        const tubeUser = await getItem("userRoomId", event.room_id);
        let user;

        if (tubeUser) {
            user = tubeUser.content.user;
        }
        else {
            const roomStateResponse = await getRoomState(event.room_id);
            const roomState = await roomStateResponse.json();

            let newTubeUserName = "default";

            for (const roomEvent of roomState) {
                if (roomEvent.type === "m.room.name")
                    newTubeUserName = roomEvent.content.name;
            }

            const newUserResponse = await registerUser(newTubeUserName);
            const newUser = await newUserResponse.json();

            user = newUser;

            storeItem({
                type: "spacetube.user",
                userId: newUser.user_id,
                user: newUser,
                userRoomId: event.room_id,
                name: newTubeUserName
            });

            setDisplayName(newUser, newTubeUserName);

            await invite(newUser, tubeIntermediary);
            await join(newUser, tubeIntermediary);
            await invite(newUser, event.room_id);
            await join(newUser, event.room_id);
        }

        sendMessageAsUser(user, tubeIntermediary, message);
    }
}

export const handleInvite = async (event) => {
    if (event.content.membership === "invite") {
        await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/join/${event.room_id}?user_id=@space-tube-bot:${HOME_SERVER}`, {
            method: 'POST',
            body: JSON.stringify({}),
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${APPLICATION_TOKEN}`
            }
        })

        if (event.sender.includes("@space-tube-bot") && event.sender !== `@space-tube-bot:${HOME_SERVER}`) {
            console.log(event);
            await storeItem({
                type: "spacetube.shared.management",
                sharedWithInstance: event.sender,
                roomId: event.room_id
            })
        }
    }
}