import mongoose from "mongoose"

const Schema = mongoose.Schema;
//const ObjectId = Schema.Types.ObjectId;

const UserSchema = new Schema({
  user: {
    type: String,
    
    unique: true
  },
  password: {
    type: String,
    required: true,
    unique: true
  },
  tracks: {
    type: Array,
    default: []
  },
  booked_tracks: {
    type: Array,
    default: []
  },
  reviews:{
    type: Object,
    default: {}
  },
  favourites:{
    type: Array,
    default: []
  },
  customLinks:{
    type: Array,
    default: []
  }
});

const UserModel = mongoose.model("user", UserSchema)

export default UserModel