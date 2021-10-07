const express = require("express");
const Task = require("../model/task");
const auth = require("../middleware/auth");
const router = new express.Router();

router.post("/tasks", auth, async (req, res) => {
  const task = new Task({
    ...req.body,
    owner: req.user._id,
  });

  try {
    await task.save();
    res.status(201).json(task);
  } catch (e) {
    res.status(500).json(e);
  }
});

// get /tasks?completed=boolean
// get /tasks/?limit=number&skip=number
// get /tasks/sortBy=createdBy_asc
router.get("/tasks", auth, async (req, res) => {
  const match = {};
  const sort = {};

  const query = req.query;
  if (query.completed)
    match.completed = query.completed === "true" ? true : false;

  if (query.sortBy) {
    const [field, order] = query.sortBy.split("_");
    sort[field] = order === "asc" ? 1 : -1;
  }
  try {
    await req.user.populate({
      path: "tasks",
      match,
      options: {
        limit: parseInt(req.query.limit),
        skip: parseInt(req.query.skip),
        sort,
      },
    });
    res.json(req.user.tasks);
  } catch (e) {
    res.status(500).json(e);
  }
});

router.get("/tasks/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const task = await Task.findOne({ _id: id, owner: req.user._id });
    if (!task) return res.status(404).json({ error: "No task found" });
    res.json(task);
  } catch (e) {
    res.status(500).json(e);
  }
});

router.patch("/tasks/:id", auth, async (req, res) => {
  const { id } = req.params;
  const taskData = req.body;
  const updates = Object.keys(taskData);
  const allowedUpdates = ["description", "completed"];

  const isValidOperations = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperations)
    return res.status(400).json({ error: "Invalid updates" });

  try {
    const task = await Task.findOne({ _id: id, owner: req.user._id });

    if (!task) return res.status(400).json({ error: "No task found" });

    updates.forEach((update) => (task[update] = taskData[update]));

    await task.save();

    res.json(task);
  } catch (e) {
    res.status(500).json(e);
  }
});

router.delete("/tasks/:id", auth, async (req, res) => {
  const { id } = req.params;

  try {
    const task = await Task.findByIdAndDelete({ _id: id, owner: req.user._id });

    if (!task) return res.status(400).json({ error: "No task found" });

    res.json(task);
  } catch (e) {
    res.status(500).json(e);
  }
});

module.exports = router;
