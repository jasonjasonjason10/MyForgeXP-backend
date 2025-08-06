const express = require("express");
const router = express.Router();
const prisma = require("../../prisma");
const tokenAuth = require("../middleware/TokenAuth");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "src/images/games");
  },
  filename: (req, file, cb) => {
    const prefix = `${Date.now()}-${req.userId}`;
    cb(null, `${prefix}-${file.originalname}`)
  }
})

const upload = multer({ storage });

//====NOT SURE IF ANY MULTER STORAGE ABOVE WORKS====

// Get all communities
router.get("/all", async (req, res, next) => {
  const games = await prisma.gameCommunity.findMany({
    include: {
      posts: true
    }
  });
  res.status(200).json({
    games: games,
  });
});

// Get single community by ID
router.get("/:id", async (req, res, next) => {
  try {
    const id = +req.params.id;
    const community = await prisma.gameCommunity.findUnique({ where: { id } });

    if (!community)
      return res.status(404).json({ error: "Community not found" });

    res.status(200).json({
      game: community,
    });
  } catch (error) {
    next(error);
  }
});

// Create community
router.post("/create", tokenAuth, upload.single("coverImage"), async (req, res, next) => {
    try {
      const { gameName, description } = req.body;
      const isAdmin = req.isAdmin;
      if (!isAdmin) {
        return res.status(403).json({
          error: "no auth",
        });
      }
      if (!req.file)
        return res.status(404).json({ error: "No image uploaded" });

      const coverImage = `/images/games/${req.file.filename}`;
      if (!gameName)
        return res.status(404).json({ error: "Missing game name" });
      const existing = await prisma.gameCommunity.findUnique({
        where: { gameName },
      });
      if (existing)
        return res.status(400).json({ error: "Community already exists" });
      const newCommunity = await prisma.gameCommunity.create({
        data: { gameName, description, coverImage },
      });

      res.status(201).json({
        game: newCommunity,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update community
router.put( "/update/:id", tokenAuth, upload.single("newCover"), async (req, res, next) => {
    try {
      const id = +req.params.id;
      const isAdmin = req.isAdmin;
      if (!isAdmin) {
        return res.status(403).json({
          error: "no auth",
        });
      }
      const existing = await prisma.gameCommunity.findUnique({ where: { id } });
      
      const coverImage = req.file ? `/images/games/${req.file.filename}` : undefined;

      const { gameName, description, isActive } = req.body;

      if (!existing)
        return res.status(404).json({ error: "Community not found" });

      const updated = await prisma.gameCommunity.update({
        where: { id },
        data: { gameName, description, coverImage, isActive },
      });

      res.status(200).json({ message: "Community updated", updated });
    } catch (error) {
      next(error);
    }
  }
);

// Delete community
router.delete("/delete/:id", tokenAuth, async (req, res, next) => {
  try {
    const id = +req.params.id;
    const isAdmin = req.isAdmin

    if(!isAdmin){
      return res.status(403).json({
        error: "no priv"
      })
    }

    const existing = await prisma.gameCommunity.findUnique({ where: { id } });

    console.log("existing => ", existing)
    if (!existing)
      return res.status(404).json({ error: "Community not found" });

    const itsPosts = await prisma.post.findMany({ where: {communityId: id}, select: { id: true } })

    const postIds = itsPosts.map(post => post.id)

    if (postIds.length > 0) await prisma.favorites.deleteMany({ where: {postId: {in: postIds}}})

    await prisma.post.deleteMany({ where: {communityId: id} })

    await prisma.gameCommunity.delete({ where: { id } });

    res.status(200).json({ message: "Community deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
