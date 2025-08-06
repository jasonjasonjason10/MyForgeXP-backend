require("dotenv").config();
const express = require("express");
const prisma = require("../../prisma");
const router = express.Router();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuid } = require("uuid");
const tokenAuth = require("../middleware/TokenAuth");

console.log('ACCESS KEY', process.env.AWS_ACCESS_KEY_ID)
console.log('SECRET ACCESS', process.env.AWS_SECRET_ACCESS_KEY)

// Set up AWS S3 Client - FIX: Use standard AWS environment variable names
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,     // Standard AWS env var name
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY  // Standard AWS env var name
  }
});

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;
const PUBLIC_BASE = `https://${BUCKET}.s3.${REGION}.amazonaws.com`;

// Middleware for JSON parsing (only need this once)
router.use(express.json());

// Helper function to construct public S3 URL
function buildPublicUrl(key) {
  return `${PUBLIC_BASE}/${key}`;
}

// ✅ Secure S3 upload URL route
router.get("/generate-upload-url", tokenAuth, async (req, res, next) => {
  try {
    const { filename, fileType } = req.query;
    console.log(req.query);
    
    if (!filename || !fileType) {
      return res.status(400).json({ error: "Missing filename or fileType" });
    }

    const key = `images/posts/${uuid()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
    console.log('UPLOAD URL HERE', uploadUrl)

    res.status(200).json({
      uploadUrl,
      key,
      publicUrl: buildPublicUrl(key)
    });
  } catch (err) {
    console.error("S3 Upload URL Error:", err);
    res.status(500).json({ error: "Failed to generate upload URL", details: err.message });
  }
});

// get all posts from a community by id
router.get("/all", async (req, res) => {
  try {
    const post = await prisma.post.findMany({
      include: {
        likes: true,
        user: {
          select: {
            username: true,
            avatar: true,
            id: true
          }
        }
      },
    });

    if (!post || post.length === 0) {
      return res.status(404).json({
        error: "no posts found",
      });
    }
    
    res.status(200).json({
      successMessage: "successfully returned all posts",
      post: post,
    });
  } catch (err) {
    console.error("Get all posts error:", err);
    res.status(500).json({ error: "Failed to retrieve posts", details: err.message });
  }
});

// get all posts from a user by id - REMOVED DUPLICATE ROUTE
router.get("/user/:id", async (req, res) => {
  try {
    const userId = +req.params.id;
    const post = await prisma.post.findMany({
      where: { userId },
      include: { 
        community: true,
        likes: true 
      }, 
    });

    if (!post || post.length === 0) {
      return res.status(404).json({
        error: "no posts found",
      });
    }
    
    res.status(200).json({
      successMessage: "successfully returned user's posts",
      post: post,
    });
  } catch (err) {
    console.error("Get user posts error:", err);
    res.status(500).json({ error: "Failed to retrieve user posts", details: err.message });
  }
});

// grab post by community id
router.get("/game/:id", async (req, res) => {
  try {
    const id = +req.params.id;
    const postList = await prisma.post.findMany({
      where: { communityId: id },
      include: {
        likes: true
      }
    });
    
    res.json({
      posts: postList,
    });
  } catch (err) {
    console.error("Get community posts error:", err);
    res.status(500).json({ error: "Failed to retrieve community posts", details: err.message });
  }
});

// create a post
router.post(
  "/create",
  tokenAuth,
  async (req, res, next) => {
    try {
      const userId = req.userId;
      console.log(userId);
      
      if (!userId) {
        return res.status(400).json({ error: "Not authenticated." });
      }

      const { title, description, PostType, content, communityId } = req.body;
      console.log(communityId);
      
      // Ensure communityId is properly parsed as an integer
      const cid = parseInt(communityId);
      console.log(cid);
      
      if (isNaN(cid) || !title) {
        return res.status(400).json({ error: "Missing or invalid required fields." });
      }

      // Base data
      const postData = {
        userId,
        communityId: cid,
        title,
        description: description || null,
        PostType,
        content: null,
      };

      // Determine content
      if (PostType === "image" || PostType === "video") {
        // content should be the S3 key
        if (!content) {
          return res
            .status(400)
            .json({ error: "Missing S3 key for image/video post." });
        }
        postData.content = buildPublicUrl(content.trim());
      } else {
        // For text post, use the content as is
        postData.content = content;
      }

      const created = await prisma.post.create({ data: postData });

      res.status(201).json({
        successMessage: "Post created successfully!",
        post: created,
      });
    } catch (err) {
      console.error("Create post error:", err);
      res.status(500).json({ error: "Failed to create post", details: err.message });
      next(err);
    }
  }
);

// edit a post by id & optional file reupload & update PostType
router.patch("/edit", tokenAuth, async (req, res, next) => {
  try {
    const { postId, title, description, content, PostType } = req.body;

    if (!postId) {
      return res.status(400).json({ error: "Missing postId" });
    }

    // Find the post to check if it exists and if user is authorized
    const existingPost = await prisma.post.findUnique({
      where: { id: Number(postId) }
    });

    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (existingPost.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to edit this post" });
    }

    const dataToUpdate = {};
    
    // Only update fields that are provided
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    
    // Handle S3 content or file uploads
    if (req.file) {
      dataToUpdate.content = `/images/posts/${req.file.filename}`;

      if (req.file.mimetype.startsWith("image/")) {
        dataToUpdate.PostType = "image";
      } else if (req.file.mimetype.startsWith("video/")) {
        dataToUpdate.PostType = "video";
      }
    } else if (content && PostType) {
      // Direct content update
      dataToUpdate.content = content;
      dataToUpdate.PostType = PostType;
    }

    const updatedPost = await prisma.post.update({
      where: { id: Number(postId) },
      data: dataToUpdate,
    });

    res.status(200).json({
      successMessage: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Edit post error:", error);
    res.status(500).json({ error: "Failed to update post", details: error.message });
    next(error);
  }
});

// delete a post by id - IMPLEMENTATION ADDED
router.delete("/delete", tokenAuth, async (req, res, next) => {
  try {
    const { postId } = req.body;
    
    if (!postId) {
      return res.status(400).json({ error: "Missing postId" });
    }
    
    // Find the post to check if it exists and if user is authorized
    const existingPost = await prisma.post.findUnique({
      where: { id: Number(postId) }
    });
    
    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    if (existingPost.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to delete this post" });
    }
    
    // Delete likes first to avoid foreign key constraint errors
    await prisma.like.deleteMany({
      where: { postId: Number(postId) }
    });
    
    // Delete the post
    await prisma.post.delete({
      where: { id: Number(postId) }
    });
    
    res.status(200).json({
      successMessage: "Post deleted successfully"
    });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ error: "Failed to delete post", details: error.message });
    next(error);
  }
});

//like toggle===========================
router.post("/:id/like", tokenAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const postId = +req.params.id;
    
    const existingLike = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    
    if (existingLike) {
      await prisma.like.delete({ where: { userId_postId: { userId, postId } } });
      return res.json({
        successMessage: "Post Unliked",
        liked: false,
      });
    } else {
      await prisma.like.create({ data: { userId, postId } });
      return res.json({
        successMessage: "Post Liked",
        liked: true,
      });
    }
  } catch (err) {
    console.error("Like toggle error:", err);
    res.status(500).json({ error: "Failed to toggle like", details: err.message });
  }
});

// user like verification================================
router.post("/hasliked/:id", tokenAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const postId = +req.params.id;
    
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { likes: true },
    });
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const relationExists = post.likes.some((like) => like.userId === userId);

    res.json({
      successMessage: "returned post like info",
      boolean: relationExists,
    });
  } catch (err) {
    console.error("Has liked check error:", err);
    res.status(500).json({ error: "Failed to check like status", details: err.message });
  }
});

module.exports = router;