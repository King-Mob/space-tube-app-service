import { v4 as uuidv4 } from 'uuid';
import {
    item,
    event,
    user
} from "../types.js";
import { access } from 'fs';

const { HOME_SERVER, APPLICATION_TOKEN, MANAGEMENT_ROOM_ID } = process.env

export const storeItem = (item: item) => {
    const txnId = uuidv4();

    return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${MANAGEMENT_ROOM_ID}/send/${item.type}/${txnId}?user_id=@spacetube_bot:${HOME_SERVER}`, {
        method: "PUT",
        body: JSON.stringify(item),
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    });
}

export const storeItemShared = (sharedRoomId, item: item) => {
    console.log("shared mgmtroom id", sharedRoomId);
    const txnId = uuidv4();

    return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${sharedRoomId}/send/${item.type}/${txnId}?user_id=@spacetube_bot:${HOME_SERVER}`, {
        method: "PUT",
        body: JSON.stringify(item),
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    });
}

export const getItem = async (key: string, value: string, type: null | string = null) => {
    const response = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${MANAGEMENT_ROOM_ID}/messages?limit=10000&dir=b`, {
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    });
    const eventsList = await response.json() as { chunk: event[] };

    for (const event of eventsList.chunk) {
        if (event.content[key] === value) {
            if (type) { //match by optional type
                if (event.type === type)
                    return event;
            }
            else
                return event;
        }

    }

    return null;
}

export const getAllItems = async (key, value, type) => {

    const response = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${MANAGEMENT_ROOM_ID}/messages?limit=10000&dir=b`, {
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    });
    const eventsList = await response.json() as { chunk: event[] };

    const matchingEvents = [];

    for (const event of eventsList.chunk) {
        if (event.content[key] === value) {
            if (type) { //match by optional type
                if (event.type === type)
                    matchingEvents.push(event);
            }
            else
                matchingEvents.push(event);
        }
    }

    return matchingEvents;
}

export const getItemIncludes = async (key, value) => {
    const response = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${MANAGEMENT_ROOM_ID}/messages?limit=10000&dir=b`, {
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    });
    const eventsList = await response.json() as { chunk: event[] };

    for (const event of eventsList.chunk) {
        const possibleItem = event.content[key];
        if (possibleItem && possibleItem.includes(value))
            return event;
    }

    return null;
}

export const getAllItemIncludes = async (key, value) => {
    const response = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${MANAGEMENT_ROOM_ID}/messages?limit=10000&dir=b`, {
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    });
    const eventsList = await response.json() as { chunk: event[] };

    const matchingEvents = [];

    for (const event of eventsList.chunk) {
        const possibleItem = event.content[key];
        if (possibleItem && possibleItem.includes(value))
            matchingEvents.push(event);
    }

    return matchingEvents.length > 0 ? matchingEvents : null;
}

export const getItemShared = async (sharedRoomId, key, value) => {

    const response = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${sharedRoomId}/messages?limit=1000`, {
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    });
    const eventsList = await response.json() as { chunk: event[] };

    for (const event of eventsList.chunk) {
        if (event.content[key] === value)
            return event;
    }

    return null;
}

export const getDisplayName = async (sharedRoomId: string, userId: string) => {
    const response = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${sharedRoomId}/messages?limit=10000`, {
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    });
    const eventsList = await response.json() as { chunk: event[] };

    let displayName = null;

    for (const event of eventsList.chunk) {
        if (event.type === "m.room.member" && event.user_id === userId && event.content.displayname && event.content.membership === "join")
            displayName = event.content.displayname;
    }

    return displayName;
}

export const getDisplayNameAsUser = async (user: user, sharedRoomId: string, userId: string) => {
    const response = await fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${sharedRoomId}/messages?limit=1000`, {
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${user.access_token}`
        }
    });
    const eventsList = await response.json() as { chunk: event[] };

    let displayName = null;

    for (const event of eventsList.chunk) {
        if (event.type === "m.room.member" && event.user_id === userId && event.content.displayname && event.content.membership === "join")
            displayName = event.content.displayname;
    }

    return displayName;
}

export const removeItem = async (eventId: string, reason: string) => {
    return fetch(`https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${MANAGEMENT_ROOM_ID}/redact/${eventId}/${uuidv4()}`, {
        method: "PUT",
        body: JSON.stringify({
            reason
        }),
        headers: {
            "Authorization": `Bearer ${APPLICATION_TOKEN}`
        }
    })
}