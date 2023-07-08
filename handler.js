import fetch from 'node-fetch';
import { storeItem, getItem } from "./storage.js";
import { v4 as uuidv4 } from 'uuid';

const { HOME_SERVER, APPLICATION_TOKEN } = process.env;

const sendMessage = (roomId, message) => {
    fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/send/m.room.message?user_id=@space-tube-bot:${HOME_SERVER}`, {
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

export const handleMessage = async (event) => {
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

        console.log(otherTube.content.name.split("registration-")[1]);
        const otherRoomId = otherTube.content.name.split("registration-")[1];

        const connection = `connection-${event.room_id}-${otherRoomId}`;

        const tubeConnection = await getItem("name", connection);

        if (!tubeConnection) {
            storeItem({ name: connection, type: "spacetube.connect" });
        }

        const otherConnection = `connection-${otherRoomId}-${event.room_id}`;

        const otherTubeConnection = await getItem("name", otherConnection);

        if (otherTubeConnection) {
            storeItem({ name: `open-${event.room_id}-${otherRoomId}`, type: "spacetube.open" });
            sendMessage(event.room_id, "I declare this tube is now open!");
            sendMessage(otherRoomId, "I declare this tube is now open!");
        }
    }

    //create itermediary room and store

    //if room id appears in tube management room as active tube, send message to intermediary room. 
    //using the registered ids, need to register another one for the other tube member

    //check if there's a user for the group.
    //if not, register one

    //if room id appears as intermediary room, send to all tube openings managed by this instance

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