import "dotenv/config";
import { room, event } from "../types"

const { HOME_SERVER, APPLICATION_TOKEN } = process.env;

const findOrCreateManagementRoom = async () => {
    const response = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/joined_rooms?user_id=@spacetube_bot:${HOME_SERVER}`, {
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    })
    const roomsList = await response.json() as { joined_rooms: string[] };

    for (const roomId of roomsList.joined_rooms) {
        const response = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/state??user_id=@spacetube_bot:${HOME_SERVER}`, {
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${APPLICATION_TOKEN}`
            }
        })
        const roomStateEvents = await response.json() as event[];

        for (const event of roomStateEvents) {
            if (event.type === "m.room.canonical_alias")
                if (event.content.alias == `#_space-tube-management:${HOME_SERVER}`) {
                    console.log("space-tube-management room exists");
                    console.log(`room id is ${event.room_id}`)
                    return roomId;
                }
        }
    }

    console.log("creating space-tube-management room");
    const createRoomResponse = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/createRoom?user_id=@spacetube_bot:${HOME_SERVER}`, {
        method: "POST",
        body: JSON.stringify({
            room_alias_name: "_space-tube-management"
        }),
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    });
    const room = await createRoomResponse.json() as room;

    console.log(`room id is ${room.room_id}`)

    return room.room_id;
}

findOrCreateManagementRoom();