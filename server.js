const path = require("path");
const cors = require("cors");
const express = require("express");
const morgan = require("morgan");
const app = express();
require("dotenv").config();
const fileUpload = require("express-fileupload");


const prisma = require("./prisma"); // ✅ Moved to top so it's available earlier

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://www.forgexp.net",
      "https://forgexp.net",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(fileUpload())
app.use(morgan("dev"));

// ============= Routes ================

const userRouter = require("./src/routes/user");
app.use("/user", userRouter);

const followRouter = require("./src/routes/follow");
app.use("/user", followRouter);

const favoritesRouter = require("./src/routes/favorites");
app.use("/user", favoritesRouter);

const postRouter = require("./src/routes/post");
app.use("/post", postRouter);

const gameRouter = require("./src/routes/games");
app.use("/games", gameRouter);

const commentsRouter = require("./src/routes/comments");
app.use("/post", commentsRouter);

// ============= Static image folders ================
app.use(
  "/images/pfp",
  express.static(path.join(__dirname, "src", "images", "pfp"))
);
app.use(
  "/images/posts",
  express.static(path.join(__dirname, "src", "images", "posts"))
);
app.use(
  "/images/games",
  express.static(path.join(__dirname, "src", "images", "games"))
);

// ============= Error handler ================
app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).json({ error: err.message });
});

// ============= Start server ================
app.listen(3000, () => {
  console.log("server running on port 3000");
});
