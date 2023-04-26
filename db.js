import mongoose from "mongoose"

const Schema = mongoose.Schema;
//const ObjectId = Schema.Types.ObjectId;

const TrackSchema  = new Schema({
  name: String,
  price: String,
  location : String,
  city: String,
  description: String,
  booked: Object,
  img_urls: Array,
  slot_number: Array,
  reviews: Array,
  latAndLong: Array,
  trackName: Array,
 
});

const TrackModel = mongoose.model("Track", TrackSchema)

export default TrackModel