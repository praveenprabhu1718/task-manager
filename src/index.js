const express = require("express");
require("./db/mongoose");
const userRouter = require("./routers/user");
const taskRouter = require("./routers/task");

const app = express();
const PORT = process.env.PORT;

const multer = require("multer");
const upload = multer({
  dest: "images",
  limits: {
    fileSize: 1000000,
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(doc|docx)$/gim))
      return cb(new Error("File must be doc"));

    cb(undefined, true);
  },
});

app.post(
  "/upload",
  upload.single("upload"),
  (req, res) => {
    res.send();
  },
  (err, req, res, next) => {
    res.status(400).json({ error: err.message });
  }
);

app.use(express.json());

app.use(userRouter);
app.use(taskRouter);

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
