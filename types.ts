export type user = { user_id: string, access_token: string };

export type item = {
    type: string;
    [key: string]: any;
}

export type room = { room_id: string };

export type event = {
    type: string;
    sender: string;
    room_id: string;
    content: {
        [key: string]: any;
    }
    [key: string]: any;
}

export type TubeRoomLink = {
    channel_id: string;
    channel_type: string;
    tube_room_id: string;
}