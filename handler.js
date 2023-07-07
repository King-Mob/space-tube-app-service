import fetch from 'node-fetch';
import {storeItem, getItem} from "./storage.js";

export const handleMessage = async (event) => {
    const message = event.content.body;

    if (message.includes("!space-tube echo")) {
        const newMessage = "you said: " + message.split("!space-tube echo")[1];

        fetch(`https://matrix.wobbly.app/_matrix/client/v3/rooms/${event.room_id}/send/m.room.message?user_id=@space-tube-bot:wobbly.app`, {
            method: 'POST',
            body: JSON.stringify({
                body: newMessage,
                msgtype: "m.text"
            }),
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${process.env.APPLICATION_TOKEN}`
            }
        })
    }

    if (message.includes("!space-tube create")) {
        const tubeOpening = await getItem(`registration-${event.room_id}`);

        if(!tubeOpening){
            storeItem({itemName: `registration-${event.room_id}`})
        }

        //send back the special code that has the space-tube-instance id in it, if they need to match up
        


    }

    if (message.includes("!space-tube connect")) {
        //look in the tube management room for create messages

        //there needs to be 2 matches received before we enter something in the tube management room


        //special case is when 2 instances of space tube, then will need new management room both are in?

        //intermediary room is created and put room id tube management room
        //if 2 instances, the second one to receive !match is going to create the intermediary room, and invite the other one

    }

    //if room id appears in tube management room as active tube, send message to intermediary room. 
    //using the registered ids, need to register another one for the other tube member

    //check if there's a user for the group.
        //if not, register one

    //if room id appears as intermediary room, send to all tube openings managed by this instance

}

export const handleInvite = (event) => {
    if (event.content.membership === "invite") {
        fetch(`https://matrix.wobbly.app/_matrix/client/v3/join/${event.room_id}?user_id=@example-appservice:wobbly.app`, {
            method: 'POST',
            body: JSON.stringify({}),
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${process.env.APPLICATION_TOKEN}`
            }
        })
    }
}