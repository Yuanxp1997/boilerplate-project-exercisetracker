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
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    });
    user.save().then((data) => {
      return done(null, data);
    });
  }
};

// get user log function
const getUserLog = async (userId, from, to, limit, done) => {
  const user = await User.findById(userId).exec();
  if (!user) {
    return done("user not found");
  } else {
    let log = user.log;
    if (from) {
      log = log.filter((exercise) => exercise.date >= new Date(from));
    }
    if (to) {
      log = log.filter((exercise) => exercise.date <= new Date(to));
    }
    if (limit) {
      log = log.slice(0, limit);
    }
    return done(null, {
      _id: user._id,
      username: user.username,
      count: user.count,
      log: log,
    });
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
    if (err) {
      return res.json({ error: err });
    } else {
      return res.json({
        _id: userId,
        username: data.username,
        date: date ? new Date(date).toDateString() : new Date().toDateString(),
        duration: parseInt(duration),
        description: description,
      });
    }
  });
});

// handle get request to get user log
app.get("/api/users/:_id/logs", (req, res) => {
  const { from, to, limit } = req.query;
  const userId = req.params._id;
  getUserLog(userId, from, to, limit, (err, data) => {
    if (err) {
      return res.json({ error: err });
    } else {
      return res.json(data);
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
