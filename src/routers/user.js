const express = require("express");
const User = require("../model/user");
const auth = require("../middleware/auth");
const router = new express.Router();
const multer = require("multer");
const sharp = require("sharp");
const {
  sendWelcomeEmail,
  sendCancellationEmail,
} = require("../emails/account");

router.post("/users", async (req, res) => {
  const user = new User(req.body);

  try {
    const token = await user.generateAuthToken();
    await user.save();
    sendWelcomeEmail(user.email, user.name);
    res.status(201).json({ user, token });
  } catch (e) {
    res.status(400).json(e);
  }
});

router.post("/users/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findByCredentials(email, password);
    const token = await user.generateAuthToken();
    res.json({ user, token });
  } catch (e) {
    res.status(400).json({ error: "Unable to login" });
  }
});

router.post("/users/logout", auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(
      (token) => token.token !== req.token
    );

    await req.user.save();
    res.json({ message: "Logged out successfully" });
  } catch (e) {
    res.status(500).json({ error: "Error in logging out" });
  }
});

router.post("/users/logout-all", auth, async (req, res) => {
  try {
    req.user.tokens = [];
    await req.user.save();
    res.json({ message: "Logged out from all devices" });
  } catch (e) {
    res.status(500).json({ error: "Error in logging out" });
  }
});

router.get("/users/me", auth, async (req, res) => {
  res.json(req.user);
});

router.patch("/users/me", auth, async (req, res) => {
  const userData = req.body;
  const updates = Object.keys(userData);
  const allowedUpdates = ["name", "email", "password", "age"];

  const isValidOperations = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperations)
    return res.status(400).json({ error: "Invalid updates" });

  try {
    const user = req.user;

    updates.forEach((update) => (user[update] = userData[update]));

    await user.save();

    res.json(user);
  } catch (e) {
    res.status(400).json(e);
  }
});

router.delete("/users/me", auth, async (req, res) => {
  try {
    const id = req.user._id;

    // delete user
    await req.user.remove();
    sendCancellationEmail(req.user.email, req.user.name);

    res.status(200).json(req.user);
  } catch (e) {
    res.status(500).json(e);
  }
});

const upload = multer({
  limits: {
    fileSize: 1000000,
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpeg|jpg|png)$/gim)) {
      return cb(new Error("File must be jpeg, jpg, png"));
    }
    cb(undefined, true);
  },
});

router.post(
  "/users/me/avatar",
  auth,
  upload.single("avatar"),
  async (req, res) => {
    const profilePhoto = req.file.buffer;
    const buffer = await sharp(profilePhoto)
      .png()
      .resize({ width: 250, height: 250 })
      .toBuffer();
    req.user.avatar = buffer;
    await req.user.save();
    res.json({ message: "Profile photo uploaded successfully" });
  },
  (err, req, res, next) => {
    res.status(400).json({ error: err.message });
  }
);

router.delete("/users/me/avatar", auth, async (req, res) => {
  const user = req.user;
  try {
    user.avatar = undefined;
    await user.save();
    res.json({ message: "Profile photo deleted!" });
  } catch (e) {
    res.status(500).json(e);
  }
});

router.get("/users/:id/avatar", async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    if (!user || !user.avatar)
      throw new Error("Error in getting profile picture");

    res.set("Content-Type", "image/png");
    res.send(user.avatar);
  } catch (e) {
    res.status(404).json(e);
  }
});

module.exports = router;
