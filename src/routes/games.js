require('dotenv').config();
const express = require("express");
const router = express.Router();
const prisma = require("../../prisma");
const tokenAuth = require("../middleware/TokenAuth");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuid } = require("uuid");

const s3  = new S3Client({ region: process.env.AWS_REGION, credentials: {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
} });
const BUCKET = process.env.S3_BUCKET;
router.use(express.json())
// 1️⃣ Generate a presigned PUT URL for clients to upload directly to S3
router.get("/generate-upload-url", async (req, res, next) => {
  try {
    const { filename, fileType } = req.query;
    if (!filename || !fileType) {
      return res.status(400).json({ error: "filename and fileType required" });
    }

    const key = `images/games/${uuid()}-${filename}`;

    // prepare S3 command
    const cmd = new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      ContentType: fileType,
    });
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 300 });
    const publicUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    res.json({ uploadUrl, key, publicUrl });
    
  } catch (err) {
    next(err);
  }
});

// Get all communities
router.get("/all", async (req, res, next) => {
  try {
    const games = await prisma.gameCommunity.findMany({
      include: { posts: true },
    });
    res.status(200).json({ games });
  } catch (err) {
    next(err);
  }
});

// Get single community by ID
router.get("/:id", async (req, res, next) => {
  const {id} = req.params;
  try {
    const game = await prisma.gameCommunity.findUnique({ where: { id: +id } });
    if (!game) return res.status(404).json({ error: "Community not found" });
    res.status(200).json({ game });
  } catch (err) {
    next(err);
  }
});

// Create community
// Client must upload image to S3 first (using /generate-upload-url), then send coverImageKey here
router.post(
  "/create",
  tokenAuth,
  async (req, res, next) => {
    try {
      if (!req.isAdmin) {
        return res.status(403).json({ error: "no auth" });
      }

      const { gameName, description, coverImageKey } = req.body;
      if (!gameName) {
        return res.status(400).json({ error: "Missing game name" });
      }
      if (!coverImageKey) {
        return res.status(400).json({ error: "Missing coverImageKey" });
      }

      // build public URL
      const coverImage = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${coverImageKey}`;

      const existing = await prisma.gameCommunity.findUnique({
        where: { gameName },
      });
      if (existing) {
        return res.status(400).json({ error: "Community already exists" });
      }

      const newCommunity = await prisma.gameCommunity.create({
        data: { gameName, description, coverImage },
      });

      res.status(201).json({ game: newCommunity });
    } catch (err) {
      next(err);
    }
  }
);

// Update community
router.put(
  "/update/:id",
  tokenAuth,
  async (req, res, next) => {
    try {
      if (!req.isAdmin) {
        return res.status(403).json({ error: "no auth" });
      }
      const id = +req.params.id;

      const existing = await prisma.gameCommunity.findUnique({
        where: { id },
      });
      if (!existing) {
        return res.status(404).json({ error: "Community not found" });
      }

      const { gameName, description, isActive, coverImageKey } = req.body;

      let coverImage = existing.coverImage;
      if (coverImageKey) {
        coverImage = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${coverImageKey}`;
      }

      const updated = await prisma.gameCommunity.update({
        where: { id },
        data: { gameName, description, coverImage, isActive },
      });

      res.status(200).json({ message: "Community updated", updated });
    } catch (err) {
      next(err);
    }
  }
);

// Delete community
router.delete("/delete/:id", tokenAuth, async (req, res, next) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ error: "no priv" });
    }
    const id = +req.params.id;
    const existing = await prisma.gameCommunity.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Community not found" });
    }

    // cascade delete posts & favorites
    const posts = await prisma.post.findMany({
      where: { communityId: id },
      select: { id: true },
    });
    const postIds = posts.map(p => p.id);
    if (postIds.length > 0) {
      await prisma.favorites.deleteMany({ where: { postId: { in: postIds } } });
    }
    await prisma.post.deleteMany({ where: { communityId: id } });
    await prisma.gameCommunity.delete({ where: { id } });

    res.status(200).json({ message: "Community deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;