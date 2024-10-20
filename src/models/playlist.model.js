import req from "express/lib/request";
import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    video: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video",
        },
    ],
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    owner :{
        type : Schema.Types.ObjectId,
        ref : "User"
    }
});

export const Playlist = mongoose.model("Playlist",playlistSchema)
