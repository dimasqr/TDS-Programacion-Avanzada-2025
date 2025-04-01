var express = require("express");
var router = express.Router();
const Habit = require("../models/Habit");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token not provided. Access Denied." });
  }

  try {
    const tokenWithoutBearer = token.replace("Bearer ", "");
    const verified = jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

router.get("/habits", authenticateToken, async (req, res) => {
  try {
    let userId =
      req.user && req.user.userId
        ? req.user.userId
        : res.status(500).json({ message: "Error retreiving habit." });
    const habits = await Habit.find({
      userId: new mongoose.Types.ObjectId(userId),
    });
    res.json(habits);
  } catch (err) {
    res.status(500).json({ message: "Error retrieving habits" });
  }
});

// ############################################### //
//                  Endpoint Altas                 //
// ############################################### //
router.post("/habits", authenticateToken, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!req.user || !req.user.userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Missing user ID." });
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const habit = new Habit({ title, description, userId });

    await habit.save();
    res.json(habit);
  } catch (err) {
    res.status(400).json({ message: "Error creating habit" });
  }
});

// ############################################### //
//                  Endpoint Bajas                 //
// ############################################### //
router.delete("/habits/:id", authenticateToken, async (req, res) => {
  try {
    await Habit.findByIdAndDelete(req.params.id);
    res.json({ message: "Habit deleted" });
  } catch (err) {
    res.status(500).json({ message: "Habit not found" });
  }
});

// ############################################### //
//                  Endpoint Cambios               //
// ############################################### //
router.put("/habits/:id", authenticateToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    const updatedHabit = await Habit.findByIdAndUpdate(
      req.params.id,
      { title, description },
      { new: true }
    );

    if (!updatedHabit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    res.json(updatedHabit);
  } catch (err) {
    res.status(400).json({ message: "Error updating habit" });
  }
});

router.patch("/habits/markasdone/:id", authenticateToken, async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    habit.lastDone = new Date();
    if (timeDifferenceInHours(habit.lastDone, habit.lastUpdated) < 24) {
      habit.lastUpdated = new Date();
      habit.days = timeDifferenceInDays(habit.lastDone, habit.startedAt);
      habit.save();
      res.status(200).json({ message: "Habit marked as done" });
    } else {
      habit.days = 1;
      habit.lastUpdated = new Date();
      habit.startedAt = new Date();
      habit.save();
      res.status(200).json({ message: "Habit restarted" });
    }
  } catch (err) {
    res.status(500).json({ message: "Error updating habit" });
  }
});

const timeDifferenceInHours = (date1, date2) => {
  const diffnceMS = Math.abs(date1 - date2);
  return diffnceMS / (1000 * 3600);
};

const timeDifferenceInDays = (date1, date2) => {
  const diffnceMS = Math.abs(date1 - date2);
  return Math.floor(diffnceMS / (1000 * 3600 * 24));
};

module.exports = router;
