import mongoose from "mongoose"

const Schema = mongoose.Schema;
//const ObjectId = Schema.Types.ObjectId;

const LinkSchema  = new Schema({
  trackName: String,
  slots : Array,
  location: String,
  time: String,
  user: Object,
  subTrackName: String,
  isopen: Boolean,
  description: String,
  city: String,
  sportType: String,
  isLimited: Boolean,
  organizer: String,
  img_urls: Array,
  reviews: Array,
  activity_start_datetime: Date,
  latAndLong: Array,
  onlineLink: String,
  price:Number,
  lengthOfActivity:Number

 
});

const LinkModel = mongoose.model("Links", LinkSchema)

export default LinkModel