import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const { HOME_SERVER, APPLICATION_TOKEN } = process.env

const createManagementRoom = async () => {

    const response = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/joined_rooms?user_id=@space-tube-bot:${HOME_SERVER}`, {
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    })
    const roomsList = await response.json();

    for (const roomId of roomsList.joined_rooms) {
        const response = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${roomId}/state??user_id=@space-tube-bot:${HOME_SERVER}`, {
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${APPLICATION_TOKEN}`
            }
        })
        const roomStateEvents = await response.json();

        for (const event of roomStateEvents) {
            if (event.type === "m.room.canonical_alias")
                if (event.content.alias == `#_space-tube-management:${HOME_SERVER}`) {
                    console.log("space-tube-management room exists");
                    return roomId;
                }
        }
    }

    console.log("creating space-tube-management room");
    const createRoomResponse = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/createRoom?user_id=@space-tube-bot:${HOME_SERVER}`, {
        method: "POST",
        body: JSON.stringify({
            room_alias_name: "_space-tube-management"
        }),
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    });
    const room = await createRoomResponse.json();

    return room.room_id;
}

const managementRoom = { id: await createManagementRoom() };

export const storeItem = (item) => {
    console.log("mgmtroom id", managementRoom.id);
    const txnId = uuidv4();

    return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${managementRoom.id}/send/${item.type}/${txnId}?user_id=@space-tube-bot:${HOME_SERVER}`, {
        method: "PUT",
        body: JSON.stringify(item),
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    });
}

export const getItem = async (key, value) => {

    const response = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${managementRoom.id}/messages?limit=1000`, {
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    });
    const eventsList = await response.json();

    for (const event of eventsList.chunk) {
        if (event.content[key] === value)
            return event;
    }

    return null;
}

export const getItemIncludes = async (key, value) => {

    const response = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${managementRoom.id}/messages?limit=1000`, {
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    });
    const eventsList = await response.json();

    for (const event of eventsList.chunk) {
        const possibleItem = event.content[key];
        if (possibleItem && possibleItem.includes(value))
            return event;
    }

    return null;
}