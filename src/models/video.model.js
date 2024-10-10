import mongoose, {Schema} from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const videoSchema = new Schema ({
  videoFile: {
    type: String, //// clodinary url
    required: true,
  },
  thumbnail: {
    type: String, // clodinary url
    required: true,
  },
  title: {
    type: String, // clodinary url
    required: true,
  },
  description: {
    type: String, // clodinary url
    required: true,
  },
  duration: {
    type: Number, // provided by 3rd party cloud
    required: true,
  },
  views: {
    type: Number,
    default: 0,
  },
//   likes: {
//     type: Number,
//     default: 0,
//   },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
});

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model ('Video', videoSchema);
