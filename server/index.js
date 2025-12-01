import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import aiRoutes from "./routes/aiRoutes.js";
import http from "http";
import { Server } from "socket.io";

dotenv.config();
import authRoutes from "./routes/auth.js";
import mongoose from "mongoose";

import "./config/passport.js";
import passport from "passport";

import googleAuth from "./routes/googleAuth.js";
import router from "./routes/note.js";





const app =express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5000",
      "https://smart-note-making.netlify.app",
    ],
    credentials: true,
  })
);
app.use(express.json());

app.set("trust proxy", 1);



app.use(
  session({
    secret: true,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // true in production
      httpOnly: true,
      sameSite: "none", // required for cross-site cookies
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api/auth", authRoutes);
app.use("/api", router);
app.use("/api/auth/google", googleAuth);
app.use("/api/ai", aiRoutes);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

//  --- Create Http + Socket.io server --

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
     origin: [
      "http://localhost:5173",
      "https://smart-note-making.netlify.app",
    ],
    credentials: true,
  }
});


// -- Real time collabroation //

io.on("connection", (socket) => {
  console.log(" user connected", socket.id);

   socket.on("join-note", (noteId) => {
    socket.join(noteId);
    console.log(`User ${socket.id} joined note ${noteId}`);
});
socket.on("edit-note", ({ noteId, content }) => {
    socket.to(noteId).emit("note-updated", content);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});






const port = process.env.PORT || 5000;

server.listen(port, () => {
  console.log(`🚀 Server + Socket.io running at http://localhost:${port}`);
});

