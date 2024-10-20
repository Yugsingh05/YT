import { type } from "express/lib/response";
import mongoose,{Schema} from "mongoose";

const tweetSchema = new Schema(
    {
        writer : {
            type : Schema.Types.ObjectId,
            ref : "User",
            required : true
        },
        content : {
            type : String,
            required : true 
        }

    },
    {
        timestamps : true
    }
)

export const Tweet = mongoose.model('Tweet',tweetSchema)