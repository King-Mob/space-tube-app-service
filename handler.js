import fetch from 'node-fetch';
import { storeItem, getItem, getItemIncludes } from "./storage.js";
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

const sendMessageUser = (user, roomId, message) => {
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

const setDisplayName = (newUser, displayName) => {
    return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/profile/@_space-tube-${newUser.user_id}:${HOME_SERVER}/displayname`, {
        method: 'PUT',
        body: JSON.stringify({
            displayname: displayName
        }),
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${newUser.access_token}`
        }
    })
}

const invite = (user, roomId) => {
    return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/invite?user_id=@space-tube-bot:wobbly.app`, {
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
            storeItem({ name: `registration-${event.room_id}`, type: "spacetube.create", tubeCode }).catch(err => console.log(err))
        }

        sendMessage(event.room_id, `The code for this room is ${tubeCode}`);
    }

    if (message.includes("!space-tube connect")) {
        //handle the other instance later, but essentially it's the same but with a new tube management room.
        //special case is when 2 instances of space tube, then will need new management room both are in?
        //intermediary room is created and put room id tube management room
        //if 2 instances, the second one to receive !match is going to create the intermediary room, and invite the other one

        const tubeCode = message.split("!space-tube connect ")[1];

        const otherTube = await getItem("tubeCode", tubeCode);

        if (!otherTube) {
            sendMessage(event.room_id, "Tubecode not recognised");
            return;
        }

        const otherRoomId = otherTube.content.name.split("registration-")[1];

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

        return;
    }

    const tubeIntermediary = await getItem("tubeIntermediary", event.room_id);

    if (tubeIntermediary) {
        console.log(event)
        console.log("message in tube intermediary");
        //send message to all tube openings managed by this instance

        console.log("tube intermediary", tubeIntermediary);

        const user = await getItem("user.user_id", event.sender);

        //really it's just the above, need to store the user_id better though
        //find user token, use the original room in spacetube.user
        //send message to their room

        //then check for their clone
        //if not there, create it.
        //their clone needs to be part of the intermediary and their room
        //get that from spacetube.open, the room that isn't event.room_id
        //clone sends message to their room

        //once these messages are going back to the original room
        //make sure that tubeOpen ignores messages from space tube users

    }

    const tubeOpen = await getItemIncludes("connectedRooms", event.room_id);

    if (tubeOpen) {
        console.log("there was a message in an open tube");
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
                user: newUser,
                userRoomId: event.room_id
            });

            setDisplayName(newUser, newTubeUserName);

            await invite(newUser, tubeIntermediary);
            await join(newUser, tubeIntermediary);
        }

        console.log(user);
        console.log(tubeIntermediary)
        console.log(tubeOpen);
        sendMessageUser(user, tubeIntermediary, message);
        //tube user send message to intermediary room 
        //(and then when it goes through intermediary, hopefully back to here)

    }


    //check if there's a user for the group.
    //if not, register one


}

export const handleInvite = (event) => {
    if (event.content.membership === "invite") {
        fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/join/${event.room_id}?user_id=@space-tube-bot:${HOME_SERVER}`, {
            method: 'POST',
            body: JSON.stringify({}),
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${APPLICATION_TOKEN}`
            }
        })
    }
}