import mongoose from "mongoose"

const Schema = mongoose.Schema;
//const ObjectId = Schema.Types.ObjectId;

const LinkSchema  = new Schema({
  trackName: String,
  slots : Array,
  location: String,
  time: String,
  user: Object,

 
});

const LinkModel = mongoose.model("Links", LinkSchema)

export default LinkModel