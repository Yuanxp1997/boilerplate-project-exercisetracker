const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const mUri = process.env.MONGO_URI;

console.log(mUri);

mongoose.connect(mUri);
const userSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [{ description: String, duration: Number, date: Date }],
});

const User = mongoose.model("User", userSchema);

// create user function
const createUser = async (username, done) => {
  const user = await User.findOne({ username: username }).exec();
  if (user) {
    return done(null, "username taken");
  } else {
    const newUser = new User({ username: username, count: 0, log: [] });
    newUser.save().then((data) => {
      return done(null, data);
    });
  }
};

// get all users function
const getAllUsers = async (done) => {
  const users = await User.find({}).select("username _id").exec();
  return done(null, users);
};

// add exercise function
const addExercise = async (userId, description, duration, date, done) => {
  const user = await User.findById(userId).exec();
  if (!user) {
    return done("user not found");
  } else {
    user.count += 1;
    user.log.push({
      description: description,
      duration: duration,
      date: date ? new Date(date) : new Date(),
    });
    user.save().then((data) => {
      return done(null, data);
    });
  }
};

// get user exercises function
const getUserExercises = async (userId, done) => {
  const user = await User.findById(userId).select("username _id log").exec();
  if (!user) {
    return done("user not found");
  } else {
    return done(null, user);
  }
};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
// handle post request to create user
app.post("/api/users", (req, res) => {
  createUser(req.body.username, (err, data) => {
    if (err) return res.json({ error: err });
    if (data === "username taken") return res.json({ error: "username taken" });
    return res.json({ username: data.username, _id: data._id });
  });
});

// handle get request to get all users
app.get("/api/users", (req, res) => {
  getAllUsers((err, data) => {
    if (err) return res.json({ error: err });
    return res.json(data);
  });
});

// handle post request to add exercise
app.post("/api/users/:_id/exercises", (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;
  addExercise(userId, description, duration, date, (err, data) => {
    if (err) return res.json({ error: err });
    return res.json({
      _id: userId,
      username: data.username,
      description: description,
      duration: duration,
      date: date ? new Date(date).toDateString() : new Date().toDateString(),
    });
  });
});

// handle get request to get user exercises
app.get("/api/users/:_id/logs", (req, res) => {
  const userId = req.params._id;
  getUserExercises(userId, (err, data) => {
    if (err) return res.json({ error: err });
    return res.json(data);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
