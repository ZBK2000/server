import express from "express";
import mongoose from "mongoose";
import { config } from "dotenv";
import TrackModel from "./db.js";
import cors from "cors";
import UserModel from "./usersdb.js";
import multer from "multer";
import path from "path";
import fs from "fs"
config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "../../../../public/images");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

//this is for storing the images
app.post("/img", upload.array("img_urls"), async function (req, res) {
  const existingTrack = await TrackModel.findOneAndUpdate(
    { name: req.body.track },
    { $set: { img_urls: req.files } },
    { new: true }
  );
  const allTrack = await TrackModel.find();
  res.send(allTrack);
});

//this is for retrieving the images
app.get("/img", async function (req, res) {
  const track = await TrackModel.findOne({ name: req.query.user_id });
  res.sendFile(
    path.join(
      process.cwd(),
      "public",
      "images",
      track.img_urls[req.query.number].filename
    )
  );
});

//this is for saving new tracks
app.post("/", async function (req, res) {
  const newTrack = new TrackModel(req.body.track);
  await newTrack.save();
  const allTrack = await TrackModel.find();
  const doc = await UserModel.findOneAndUpdate(
    { user: req.body.user },
    { $push: { tracks: req.body.track.name } },
    { new: true }
  );
  res.send(allTrack);
});

//this is fro retrieving all tracks
app.get("/", async (req, res) => {
  const allTrack = await TrackModel.find();
 
  res.send(allTrack);
});

//this for signup
app.post("/signup", async function (req, res) {
  const newUser = new UserModel(req.body);
  const existingUser = await UserModel.findOne({
    $or: [{ user: newUser.user }, { password: newUser.password }],
});

if (existingUser) {
    if (existingUser.user === newUser.user && existingUser.password === newUser.password) {
        return res.status(409).send("username and email");
    } else if (existingUser.user === newUser.user) {
        return res.status(409).send("username");
    } else if (existingUser.password === newUser.password) {
        return res.status(409).send("email");
    }
}
  res.send("successfully registrated");
});

app.post("/usersave", async function (req, res) {
  const newUser = new UserModel(req.body);
  await newUser.save();
  res.send("successfully registrated");
});

//this for login
app.post("/login", async function (req, res) {
  const user = await UserModel.findOne({ password: req.body.password });
  if (user) {
    res.send(user);
  } else {
    res.status(404).send("User not found");
  }
});

//this for modifing a certain tracks data
app.post("/tracks", async function (req, res) {
  const existingTrack = await TrackModel.findOne({ name: req.body.id });
  let text;
  for (let booked in req.body.h3s) {
    if (req.body.h3s[booked].id == req.body.time_id) {
      text = req.body.h3s[booked].text.split(" ")[0];
      break;
    }
  }
  await UserModel.findOneAndUpdate(
    { user: req.body.user },
    {
      $push: { booked_tracks: `${req.body.id}: ${req.body.rightDay} ${text}` },
    },
    { new: true }
  );

  if (existingTrack) {
    if (req.body.h3s) {
      const rightDay = req.body.rightDay;
      const doc = await TrackModel.findOneAndUpdate(
        { name: req.body.id },
        { $set: { [`booked.${rightDay}`]: req.body.h3s } },
        { new: true }
      );
      
      res.send(doc);
    } else {
      res.send(existingTrack);
    }
  }
});

//this for modifing a certain users data
app.post("/user", async function (req, res) {
  const user = await UserModel.findOne({ user: req.body.id });
  if (user) {
    res.send(user);
  }
});

//this for cancelling booked this from user data
app.post("/cancel", async function (req, res) {
  const doc = await TrackModel.findOne({ name: req.body.nameOfTrack });

  const bookedTimes = doc.booked[req.body.rightDay];
  for (let times in bookedTimes) {
    if (
      bookedTimes[times].text.indexOf(req.body.timeline.split(" ")[0]) !== -1
    ) {
      if (!bookedTimes[times].slots.includes("")) {
        bookedTimes[times].color = "black";
        bookedTimes[times].text = `${req.body.timeline.split(" ")[0]} `;
      }
      bookedTimes[times].slots = bookedTimes[times].slots.map((slot) => {
        if (slot == req.body.id) {
          return "";
        }
        return slot;
      });

      break;
    }
  }
  await TrackModel.findOneAndUpdate(
    { name: req.body.nameOfTrack },
    { $set: { [`booked.${req.body.rightDay}`]: bookedTimes } },
    { new: true }
  );
  await UserModel.findOneAndUpdate(
    { user: req.body.id },
    {
      $pull: {
        booked_tracks: `${req.body.nameOfTrack}: ${req.body.rightDay} ${req.body.timeline}`,
      },
    },
    { new: true }
  );

  res.send("success");
});
//this for initializing anew day to the tracks database
app.post("/newDay", async function (req, res) {
  const doc = await TrackModel.findOneAndUpdate(
    { name: req.body.id },
    { $set: { [`booked.${req.body.rightDay}`]: req.body.h3s } },
    { new: true }
  );
    
  res.send(doc);
});

//this for deleting tracks from the userdata
app.post("/delete", async function (req, res) {
  const id = req.body.id;
  const track = req.body.track;
  const track_for_delete = await TrackModel.findOne({ name: track });
  for (let images_number in track_for_delete.img_urls) {
    fs.unlink(path.join(
      process.cwd(),
      "public",
      "images",
      track_for_delete.img_urls[images_number].filename), (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error deleting file');
      }}
    )
  }
  await TrackModel.findOneAndDelete({ name: track });

  // search for the user based on their ID
  const users = await UserModel.find({});

  for (const user of users) {
    // retrieve the user's booked array and filter out any instances that contain the given track as a substring
    const filteredBooked = user.booked_tracks.filter(
      (item) => !item.includes(track)
    );
    const filteredtracks = user.tracks.filter((item) => !item.includes(track));

    // update the user's booked array in the database
    await UserModel.updateOne(
      { user: user.user },
      { booked_tracks: filteredBooked, tracks: filteredtracks }
    );
  }
  
  res.send("deleted");
});

app.post("/review", async function (req, res) {
  const doc = await TrackModel.findOneAndUpdate(
    { name: req.body.trackName },
    { $push: { reviews: [req.body.name, req.body.review, req.body.reviewicon] } },
    { new: true }
  );
    
  res.send(doc.reviews);
});
app.post("/initialReview", async function (req, res) {
  
  const doc = await TrackModel.findOne(
    { name: req.body.trackName }
  );
    
    try {
      res.send(doc.reviews);
    } catch (error) {
      res.send("no reviews yet")
    }
  
});

app.post("/favourites", async function (req, res) {
  
  const doc = await UserModel.findOne(
    { user: req.body.user }
  );
  try {
    if(req.body.change){
        if(doc.get('favourites') !== undefined){
        if (doc.favourites.includes(req.body.trackName)){
  const newdoc = await UserModel.findOneAndUpdate(
    { user: req.body.user },
    { $pull: { favourites: req.body.trackName } },
    { new: true }
  )
  res.send(newdoc.favourites);
} else {
    const newdoc = await UserModel.findOneAndUpdate(
      { user: req.body.user },
      { $push: { favourites: req.body.trackName } },
      { new: true }
    )
    res.send(newdoc.favourites);
  }} else{
    const newdoc = await UserModel.findOneAndUpdate(
      { user: req.body.user },
      { $push: { favourites: req.body.trackName } },
      { new: true }
    )
    res.send(newdoc.favourites);
      
    } 
   
  } else{
    try {
      res.send(doc.favourites)
    } catch (error) {
      res.send([])
    }
    
 
  }}catch (error) {
    res.send(error);
  }
});

mongoose.connect(process.env.MONGO_URL).then(() => {
  console.log("success");
}).catch((err) => {
  console.error("error connecting to MongoDB:", err);
});
const server = app.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`);
});

server.on('error', (err) => {
  console.error(`Server error: ${err}`);
});
