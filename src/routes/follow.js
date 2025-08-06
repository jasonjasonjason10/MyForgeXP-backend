const express = require("express");
const tokenAuth = require("../middleware/TokenAuth");
const prisma = require("../../prisma");
const router = express.Router();

// Create a follower relation =============
router.post("/follow/:id", tokenAuth, async (req, res) => {
  const userId = req.userId;
  const followedById = +req.params.id;

  const existingRelation = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: userId,
        followingId: followedById,
      },
    },
  });
  if (existingRelation) {
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: followedById,
        },
      },
    });
    res.json({
      successMessage: `user:${userId} => unfollowed => user:${followedById}`,
      isFollowed: false,
    });
  } else {
    await prisma.follow.create({
      data: {
        followerId: userId,
        followingId: followedById,
      },
    });
    res.json({
      successMessage: `user:${userId} => followed => user:${followedById}`,
      isFollowed: true,
    });
  }
});

router.post("/following", tokenAuth, async (req, res) => {
  const id = req.userId;
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) {
    return res.status(404).json({
      error: "no user found",
    });
  }
  const following = await prisma.follow.findMany({
    where: {
      followerId: id,
    },
    include: {
      following: true,
    },
  });
  const result = following.map((f) => {
    return f.following;
  });
  res.json({
    successMessage: `list of users user:${id} is following`,
    following: result,
  });
});

router.post("/followed", tokenAuth, async (req, res) => {
  const id = req.userId;
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) {
    return res.status(404).json({
      error: "no user found",
    });
  }
  const followedBy = await prisma.follow.findMany({
    where: {
      followingId: id,
    },
    include: {
      follower: true,
    },
  });
  const result = followedBy.map((f) => {
    return f.follower;
  });
  res.json({
    successMessage: `list of users user:${id} is followed by`,
    followedBy: result,
  });
});

// !!! 1/5 ADDED BY JASON!!!//  GET /user/follow/counts/:id  (THIS returns number of followers & following to display on a users profile)
router.get("/follow/counts/:id", async (req, res) => {
  const id = +req.params.id;

  try {
    const followers = await prisma.follow.count({
      where: { followingId: id },
    });

    const following = await prisma.follow.count({
      where: { followerId: id },
    });

    res.status(200).json({
      successMessage: "Follow counts retrieved successfully",
      followers,
      following,
    });
  } catch (err) {
    console.error("Error getting follow counts:", err);
    res.status(500).json({ error: "Failed to get follow counts" });
  }
});

// !!! 2/5 ADDED BY JASON!!!//  (This is to check to fetch if the logged-in user is following this use so that the button will display "Following")
router.get("/isfollowing/:id", tokenAuth, async (req, res) => {
  const userId = req.userId;
  const targetId = +req.params.id;

  const existingRelation = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: userId,
        followingId: targetId,
      },
    },
  });

  res.json({ isFollowing: !!existingRelation });
});

// !!! 3/5 ADDED BY JASON!!!// (This is to show a users followers)
router.get("/followed/:id", async (req, res) => {
  const id = +req.params.id;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ error: "No user found" });
  }

  const followers = await prisma.follow.findMany({
    where: { followingId: id },
    include: { follower: true },
  });

  const result = followers.map((f) => f.follower);

  res.json({
    successMessage: `Users who follow user ${id}`,
    followers: result,
  });
});

// !!! 4/5 ADDED BY JASON!!!// (This is to show who a user is following)
router.get("/following/:id", async (req, res) => {
  const id = +req.params.id;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      following: {
        include: { following: true },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const followingList = user.following.map((f) => f.following);

  res.json({
    successMessage: "Following list retrieved",
    following: followingList,
  });
});

// !!! 5/5 ADDED BY JASON!!!// (This shows a logged in users follow count")
router.get("/follow/counts/me", tokenAuth, async (req, res) => {
  console.log("Authenticated userId:", req.userId); // ← add this
  const id = req.userId;

  try {
    const followers = await prisma.follow.count({
      where: { followingId: id },
    });

    const following = await prisma.follow.count({
      where: { followerId: id },
    });

    res.status(200).json({
      successMessage: "Follow counts for logged-in user",
      followers,
      following,
    });
  } catch (err) {
    console.error("Error getting follow counts for logged-in user:", err);
    res.status(500).json({ error: "Failed to get follow counts" });
  }
});

module.exports = router;
