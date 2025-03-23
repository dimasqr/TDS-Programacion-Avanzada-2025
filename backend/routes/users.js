var express = require("express");
var router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User successfully created" });
  } catch (err) {
    res
      .status(500)
      .json({ err: "Error creating user", description: err.toString() });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Buscamos el usuario en la base de datos
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Comparar la constraseña ingresada con el hash almacenado
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid Password" });

    // Generar un JWT para la sesión
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.cookie("habitToken", token, {
      httpOnly: false, // Previene acceso desde JavaScript (XSS)
      secure: process.env.NODE_ENV === "production", // Solo HTTPS en producción
      sameSite: "Strict", // Evita envío en otros sitios
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });
    res.json({ message: "Login sucessful", token });
  } catch (err) {
    res
      .status(500)
      .json({ err: "Error loggin in", desciption: err.toString() });
  }
});

module.exports = router;
