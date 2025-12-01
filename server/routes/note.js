import express from "express";
import Note from "../models/notes.js";

import { authenticate } from "../middleware/authenticate.js";

const router = express.Router();

// Create a new note
router.post("/notes", authenticate, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ msg: "All fields required" });

    const note = new Note({
      userId: req.user.id,  // ✅ from middleware
      title,
      content,
    });

    await note.save();
    res.json({ msg: "Note created", note });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Get all notes of the logged-in user
router.get("/notes", authenticate, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});


// Get a single note
router.get("/notes/:id", authenticate, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ msg: "Note not found" });

    if (note.userId.toString() !== req.user.id)
      return res.status(403).json({ msg: "Unauthorized" });

    res.json(note);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});




// Delete a note
router.delete("/notes/:id", authenticate, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ msg: "Note not found" });

    if (note.userId.toString() !== req.user.id)
      return res.status(403).json({ msg: "Unauthorized" });

    await Note.findByIdAndDelete(req.params.id);
    res.json({ msg: "Note deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
});

// Update a note
router.put("/notes/:id", authenticate, async (req, res) => {
  try {
    const { title, content } = req.body;
    const note = await Note.findById(req.params.id);

    if (!note) return res.status(404).json({ msg: "Note not found" });
    if (note.userId.toString() !== req.user.id)
      return res.status(403).json({ msg: "Unauthorized" });

    note.title = title;
    note.content = content;
    await note.save();

    res.json({ msg: "Note updated", note });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});


export default router;
