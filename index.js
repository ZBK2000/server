import express from "express";
import mongoose from "mongoose";
import { config } from "dotenv";
import TrackModel from "./db.js";
import cors from "cors";
import UserModel from "./usersdb.js";
import multer from "multer";
import path from "path";
import fs from "fs"
import LinkModel from "./customLinkdb.js";
import nodemailer from "nodemailer"
config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "../../../../public/images");
    //cb(null, "public/images")
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false, // StartTLS should be used
  auth: {
    user: process.env.EMAIL ,
    pass: process.env.PASSWORD ,
  },
  requireTLS: true,
  tls:{
    rejectUnauthorized: false
  }
});
//this is for storing the images
app.post("/img", upload.array("img_urls"), async function (req, res) {
  try{
  if(req.body?.track){
  const existingTrack = await TrackModel.findOneAndUpdate(
    { name: req.body.track },
    { $set: { img_urls: req.files } },
    { new: true }
  );
  const allTrack = await TrackModel.find();
  res.send(allTrack);
} else if( req.body?.event){
  const existingTrack = await LinkModel.findOneAndUpdate(
    { trackName: req.body.event },
    { $set: { img_urls: req.files } },
    { new: true }
  );
  const allTrack = await TrackModel.find();
  res.send({msg:"success"});
}} catch (e){
  console.log(e)
}
});

//this is for retrieving the images
app.get("/img", async function (req, res) {
  try {
    
    if( req.query?.event){
      const track = await LinkModel.findOne({ _id: req.query.user_id });
      try {
        res.sendFile(
          path.join(
            process.cwd(),
            "../../../..",
            "public",
            "images",
            track.img_urls[req.query.number].filename
          )
        )
        
      } catch (error) {
        res.send(error)
        
      }
  
    } else {
    const track = await TrackModel.findOne({ name: req.query.user_id });
    res.sendFile(
      path.join(
        process.cwd(),
        "../../../..",
        "public",
        "images",
        track.img_urls[req.query.number].filename
      )
    );}
  } catch (error) {
    console.log(error)
  }
 
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
  const allLinks = await LinkModel.find()
 
  res.send({allTrack : allTrack, allLinks: allLinks});
});
/*app.post("/partialLoad", async (req, res) => {
  console.log(req.body)
  const count = req.body.count ;
  const count2 = req.body.count2 ;
  const batchSize = 16;
 
  if(req.body.community){

    
    const allLinks = await LinkModel.find().skip(count).limit(batchSize);
    res.send({  allLinks });
    console.log(allLinks.length )
  } else if(!req.body.community){

    const allTrack = await TrackModel.find().skip(count2).limit(batchSize);
    res.send({  allTrack });
    console.log(allTrack.length )
  }
  
 
  
});*/

app.post("/partialLoad", async (req, res) => {
  console.log(req.body);
  const count = req.body.count;
  const count2 = req.body.count2;
  const batchSize = 16;

  if (req.body.community) {
    const filterItems = req.body.filterItems || {}; // Assuming filterItems is passed in the request body
    let query = LinkModel.find();

    if (filterItems.length) {
      const shouldFilterLocation = filterItems[2] !== "";
      const shouldFilterTrackName = filterItems[3] !== "";
      const shouldFilterSportType = filterItems[4] !== "";
      const filterDateFrom = filterItems[5] !== "" ? new Date(filterItems[5]) : "";
      const filterDateTo = filterItems[6] !== "" ? new Date(filterItems[6]) : "";

      const conditions = [];

      if (!shouldFilterLocation || filterItems[2]) {
        conditions.push({ city: { $regex: new RegExp(filterItems[2], "i") } });
      }
      if (!shouldFilterTrackName || filterItems[3]) {
        conditions.push({ trackName: { $regex: new RegExp(filterItems[3], "i") } });
      }
      if (!shouldFilterSportType || filterItems[4]) {
        conditions.push({ sportType: { $regex: new RegExp(filterItems[4], "i") } });
      }
      if (filterDateFrom || filterDateTo) {
        const timeConditions = {};
        if (filterDateFrom) {
          timeConditions.$gte = filterDateFrom;
        }
        if (filterDateTo) {
          timeConditions.$lte = filterDateTo;
        }
        conditions.push({ time: timeConditions });
      }
     const currentDatetime = new Date();
      currentDatetime.setHours(0, 0, 0, 0); // Set time to 00:00:00 to compare dates only

      conditions.push({ activity_start_datetime: { $gte: currentDatetime } }); 
      if (filterItems[7] && filterItems[8]) {
        conditions.push({
          $or: [
            {
              "slots.length": { $gte: filterItems[0][0], $lte: filterItems[0][1] },
            },
            { isLimited: { $ne: filterItems[8] } },
          ],
        });
      } else if (!filterItems[7] && filterItems[8]) {
        conditions.push({ isLimited: filterItems[7] });
      } else if (filterItems[7] && !filterItems[8]) {
        conditions.push({
          "slots.length": { $gte: filterItems[0][0], $lte: filterItems[0][1] },
          isLimited: { $ne: filterItems[8] },
        });
      }
      if(!filterItems[11].length) conditions.push({ isopen: true });
      if(filterItems[11].length) conditions.push({_id: { $in: filterItems[11] }})
      query = query.and(conditions);
      console.log(conditions)
      const allLinks = await query.skip(count).limit(batchSize).exec();
    res.send({ allLinks });
    console.log(allLinks.length);
    } else{
      const conditions = [];
      const currentDatetime = new Date();
      currentDatetime.setHours(0, 0, 0, 0); // Set time to 00:00:00 to compare dates only
      conditions.push({ isopen: true });
      conditions.push({ activity_start_datetime: { $gte: currentDatetime } }); 
      console.log(conditions)
      query = query.and(conditions);
      const allLinks = await query.find().skip(count).limit(batchSize);
    res.send({  allLinks });
    console.log(allLinks.length )
    }

    
  } else if (!req.body.community) {
    const allTrack = await TrackModel.find().skip(count2).limit(batchSize).exec();
    res.send({ allTrack });
    console.log(allTrack.length);
  }
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

app.post("/GoogleSignIn", async function (req, res) {
  console.log("halo")
  const existingUser = await UserModel.findOne(
    { password: req.body.password }
);
  if (existingUser){
    res.send({msg:"successful login", userName: existingUser.user});
  } else {
    const newUser = new UserModel(req.body);
    await newUser.save();
    res.send({msg:"successfully registrated"});
  }  
   
});
  
app.post("/GoogleSignInUserName", async function (req, res) {
  const doc = await UserModel.findOneAndUpdate(
    { password: req.body.password },
    { $set: { user: req.body.user } },
    { new: true }
  );
  if (doc){
    res.send({msg:"success"});
  } else {
    
    res.send("fail");
  }
  
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
  const foundBooking = existingTrack.booked[req.body.subTrackName][req.body.rightDay].find(booking => booking.text.includes(text))
  console.log(foundBooking)
  if (!foundBooking.slots.includes("")){ 
    res.status(403).send(existingTrack)
    return
  }
  await UserModel.findOneAndUpdate(
    { user: req.body.user },
    {
      $push: { booked_tracks: [req.body.id, req.body.rightDay, text, req.body.city, req.body.sportType,req.body.subTrackName] },
    },
    { new: true }
  );

  if (existingTrack) {
    if (req.body.h3s) {
      const rightDay = req.body.rightDay;
      const subTrack = req.body.subTrackName;
      const doc = await TrackModel.findOneAndUpdate(
        { name: req.body.id },
        { $set: { [`booked.${subTrack}.${rightDay}`]: req.body.h3s } },
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
    console.log(user)
    res.send(user);
  }
});

//this for cancelling booked this from user data
app.post("/cancel", async function (req, res) {
  const doc = await TrackModel.findOne({ name: req.body.nameOfTrack });
 console.log(req.body)
  const bookedTimes = doc.booked[req.body.subTrack][req.body.rightDay];
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
    { $set: { [`booked.${req.body.subTrack}.${req.body.rightDay}`]: bookedTimes } },
    { new: true }
  );
  await UserModel.findOneAndUpdate(
    { user: req.body.id },
    {
      $pull: {
        booked_tracks: `${req.body.nameOfTrack}: ${req.body.rightDay} ${req.body.timeline} ${req.body.subTrack}`,
      },
    },
    { new: true }
  );
    console.log("haha")
  res.send("success");
});
//this for initializing anew day to the tracks database
app.post("/newDay", async function (req, res) {
  const doc = await TrackModel.findOneAndUpdate(
    { name: req.body.id },
    { $set: { [`booked.${req.body.subTrackName}.${req.body.rightDay}`]: req.body.h3s } },
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
      "../../../..",
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
  if (req.body?.linkId){
    const doc = await LinkModel.findOneAndUpdate(
      { _id: req.body.linkId },
      { $push: { reviews: [req.body.name, req.body.review] } },
      { new: true }
    );
      
    res.send(doc.reviews)
  } else {
  const doc = await TrackModel.findOneAndUpdate(
    { name: req.body.trackName },
    { $push: { reviews: [req.body.name, req.body.review, req.body.reviewicon] } },
    { new: true }
  );
    
  res.send(doc.reviews);}
});
app.post("/initialReview", async function (req, res) {
  console.log(req.body, "hhhhhhh")
  if(req.body?.linkId){
    const doc = await LinkModel.findOne(
      { _id: req.body.linkId }
    );
    try {
      console.log(doc.reviews, "hahahahaa")
      res.send(doc.reviews);
    } catch (error) {
      res.send({msg:["no reviews yet"]})
    }
  } else {
  const doc = await TrackModel.findOne(
    { name: req.body.trackName }
  );
    
    try {
      res.send(doc.reviews);
    } catch (error) {
      res.send("no reviews yet")
    }}
  
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

app.post("/customLink", async function (req, res) {
  try {
   /* for (let i = 0; i < 30; i++) {
      const newLink = new LinkModel(req.body);
      await newLink.save();
    }*/
    const newLink = new LinkModel(req.body);
    await newLink.save();
    const user  = await UserModel.findOneAndUpdate(
      { user: req.body.user },
      { $push: { customLinks: [newLink._id, newLink.trackName, newLink.time, newLink.subTrackName, newLink.organizer, newLink.city, newLink.sportType] } },
      { new: true }
    )
    res.send({msg: "success", linkId:newLink._id});
    const htmlContent = `
  <html>
    <body>
      <h2>Hi <strong>${user.user}</strong>,</h2>
      <p>You successfully created the event <strong>"${req.body.trackName}"</strong> at <strong>${req.body.time}h</strong>.</p>
      <p>We will inform you about joining/leaving participants.</p>
      <p>If you did not create this event or have any questions, please contact us at <a href="mailto:support@email.com">support@email.com</a>.</p>
      <p>Have a great time :)</p>
      <p>Sport together team</p>
    </body>
  </html>
`;
    const mailOptions = {
      from: 'businessTest@outlook.hu',
      to: `${user.password}`,
      subject: 'Successful Event creation',
      html: htmlContent
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  } catch (error) {
    res.send(error);
  }

})
app.post("/rightCustomLink", async function (req, res) {
  console.log(req.body.hashcode)
  try {
    const linkInfo = await LinkModel.findOne({ _id: req.body.hashcode });
    console.log(linkInfo)
    res.send(linkInfo);
  } catch (error) {
    res.send(error);
  }

})
app.post("/rightCustomLinkUpdate", async function (req, res) {
 
  try {
    const linkInfo = await LinkModel.findOneAndUpdate(
      { _id: req.body.data._id },
      { $set: { slots: req.body.data.slots} },
      { new: true })
      const user = await UserModel.findOne(
        { user: req.body.user}) 
        let existingArray = false
      for(let i in user.customLinks){
        for(let ii in user.customLinks[i]){
          
          if (JSON.stringify(user.customLinks[i][ii]) === JSON.stringify(linkInfo._id)){
            existingArray = true
          }
        }
      }
      
      if(!existingArray){
      await UserModel.findOneAndUpdate(
        { user: req.body.user },
        { $push: { customLinks: [linkInfo._id, linkInfo.trackName, linkInfo.time, linkInfo.subTrackName, linkInfo.organizer, linkInfo.city, linkInfo.sportType] } },
        { new: true })
        const htmlContent = `
  <html>
    <body>
      <h2>Hi <strong>${user.user}</strong>,</h2>
      <p>You successfully joined ${linkInfo.organizer}'s <strong>"${linkInfo.trackName}"</strong> event at <strong>${linkInfo.time}h</strong>.</p>
      <p>We will inform you about any changes regarding the event.</p>
      <p>If you did not join this event or have any questions, please contact us at <a href="mailto:support@email.com">support@email.com</a>.</p>
      <p>Have a great time :)</p>
      <p>Sport-Together team</p>
    </body>
  </html>
`;
        const mailOptions = {
          from: 'businessTest@outlook.hu',
          to: `${user.password}`,
          subject: 'Successful join',
          html: htmlContent
        };
        
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
          } else {
            console.log('Email sent: ' + info.response);
          }
        });
        console.log("kene hogy kuldjon")
      }
      else if(existingArray){
        const user = await UserModel.findOne({ user: req.body.user })
        const index = user.customLinks.findIndex((item) => JSON.stringify(item[0]) === JSON.stringify(linkInfo._id));
        console.log(index)
        if (index !== -1) {
          user.customLinks.splice(index, 1);
          console.log(user.customLinks)
          await user.save();}
      }
      
    //console.log(linkInfo)
    
    res.send(linkInfo);
  } catch (error) {
    console.log(error)
    res.send(error);
  }

})

app.post("/openCustomLink", async function (req, res) {
  console.log(req.body.hashcode)
  try {
    const linkInfo = await LinkModel.findOneAndUpdate(
      { _id: req.body.hashcode},
      { $set: { isopen: true} },
      { new: true })
    console.log(linkInfo)
    res.send(linkInfo);
  } catch (error) {
    res.send(error);
  }

})

app.post("/cancelEvent", async function (req, res) {
  console.log(req.body, "igen")
  try {
    const deletedEvent = await  LinkModel.findOneAndDelete({ _id: req.body.id });
    try {
      for (let images_number in deletedEvent.img_urls) {
        fs.unlink(path.join(
          process.cwd(),
          "../../../..",
          "public",
          "images",
          deletedEvent.img_urls[images_number].filename), (err) => {
          if (err) {
            console.log(err);
            
          }}
        )
      }
    } catch (error) {
      console.log(error)
    }
    
   // await  LinkModel.findOneAndDelete({ _id: req.body.id });
    try {
      const users = await UserModel.find({ user: { $in: req.body.participants } });
      console.log(users)
      for (const user of users) {
        
        const index = user.customLinks.findIndex((item) => JSON.stringify(item[0]) === JSON.stringify(req.body.id));
        console.log(index)
        if (index !== -1) {
          user.customLinks.splice(index, 1);
          console.log(user.customLinks)
          await user.save();

          const htmlContent =user.user ===deletedEvent.organizer?
          `
          <html>
            <body>
              <h2>Hi <strong>${user.user}</strong>,</h2>
              <p>You successfully cancelled your <strong>"${deletedEvent.trackName}"</strong> event at <strong>${deletedEvent.time}h</strong> was cancelled.</p>
              <p>Your cancellation message:</p>
              <hr/>
              <p>${req.body?.desc?req.body.desc: "-"}</p>
              <hr/>
              <p>We hope you find another time to organize this cool event :)</p>
              <p>Sport-Together team</p>
            </body>
          </html>
        `
          :`
          <html>
            <body>
              <h2>Hi <strong>${user.user}</strong>,</h2>
              <p>We are sorry to inform you that ${deletedEvent.organizer}'s <strong>"${deletedEvent.trackName}"</strong> event at <strong>${deletedEvent.time}h</strong> was cancelled.</p>
              <p>${deletedEvent.organizer}''s message:</p>
              <hr/>
              <p>${req.body?.desc?req.body.desc: "-"}</p>
              <hr/>
              <p>We hope you find another event that you can participate in :)</p>
              <p>Sport-Together team</p>
            </body>
          </html>
        ` ;
            const mailOptions = {
              from: 'businessTest@outlook.hu',
              to: `${user.password}`,
              subject: 'Event cancellation',
              html: htmlContent
            };
            
          await  transporter.sendMail(mailOptions );

        }
      }

      
      
      res.status(200).json({ message: 'Processing completed successfully' });
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'An error occurred while deleting' });
    }
  } catch (error) {
    console.log(error)
    res.send(error);
  }

})


app.post("/deleteAccount", async function (req, res) {
  try {
    const deleteUser = await UserModel.findOne({ user: req.body.user });
    if(deleteUser.customLinks.length){
      res.send({msg:"you organize/participate"})
      return
    }

    const deleteResult = await UserModel.deleteOne({ user: req.body.user });
    console.log(deleteResult);

    if (deleteResult.deletedCount === 1) {

      res.send({msg:"Account deleted successfully"});
    } else {
      res.send({msg:"Account not found or already deleted"});
    }
  } catch (error) {
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
