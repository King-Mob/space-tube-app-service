import { StringSelect } from "discord-interactions";

export type user = { user_id: string };
export type item = {
    type: string;
    [key: string]: any;
}
export type room = { room_id: string };
export type event = {
    type: string;
    sender: string;
    content: {
        [key: string]: any;
    }
}