const express = require("express");
const router = express.Router();
const prisma = require("../../prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const tokenAuth = require("../middleware/TokenAuth");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const {
  S3Client,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: process.env.AWS_REGION, credentials: {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
} });
const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;
const PUBLIC_BASE = `https://${BUCKET}.s3.${REGION}.amazonaws.com`;

const defaultAvatar = "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/pfp/default-avatar.png";
const DEFAULT_AVATAR_URL = defaultAvatar

function buildPublicUrl(key) {
  return `${PUBLIC_BASE}/${key}`;
}
//============Routers to create=====================

// Login Funtion ========================================
router.get("/ping", (req, res) => {
  res.send("User router is working!");
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      error: "missing email or password",
    });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(404).json({
      error: "no user found :(",
    });
  }

  const passwordCheck = await bcrypt.compare(password, user.password);
  if (!passwordCheck) {
    return res.status(401).json({
      error: "wrong password silly",
    });
  }

  const token = jwt.sign(
    { id: user.id, isAdmin: user.isAdmin },
    process.env.JWT
  );
  res.status(200).json({
    successMessage: "you gots a user :)",
    token: token,
  });
});

// creating account ========================================

router.post("/register", async (req, res) => {
  const { email, password, username, fName, lName } = req.body;
  if (!email || !password || !username) {
    return res.status(400).json({
      error: "missing email, username or password",
    });
  }
  const existingEmail = await prisma.user.findUnique({ where: { email } });

  console.log("email conflict =>", existingEmail);

  if (existingEmail) {
    return res.status(400).json({
      error: "account with this email already exists",
    });
  }
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUsername) {
    return res.status(400).json({
      error: "username is already taken",
    });
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      fName,
      lName,
      avatar: defaultAvatar,
    },
  });

  const token = jwt.sign({ id: newUser.id, isAdmin: false }, process.env.JWT);

  res.status(200).json({
    successMessage: "New User Created :)",
    token: token,
  });
});

// get other user =======================================

// router.get("/:id", async (req, res, next) => {
//     const userId = +req.params.id;
//     console.log("id =>", id)
//     const allInfo = await prisma.user.findUnique({ where: { userId }})
//     if(!allInfo){
//         return res.statusCode(404).json({
//             error: "no user found"
//         })
// }
//     const refinedInfo = {
//         username: allInfo.username,
//         avatar: allInfo.avatar,
//         fName: allInfo.fName,
//         lName: allInfo.lName,
//         createdAt: allInfo.createdAt
//     }
//     res.json({
//         successMessage: "user info returned",
//         user: refinedInfo
//     })
// })

// get user info by id ==================================

router.get("/info", tokenAuth, async (req, res, next) => {
  const id = req.userId;
  const allInfo = await prisma.user.findUnique({
    where: { id },
    include: {
      communities: true,
      favorites: true,
      posts: {
        include: {
          likes: true,
        },
      },
    },
  });
  const refinedInfo = {
    id: allInfo.id,
    email: allInfo.email,
    username: allInfo.username,
    avatar: allInfo.avatar,
    isAdmin: allInfo.isAdmin,
    fName: allInfo.fName,
    lName: allInfo.lName,
    createdAt: allInfo.createdAt,
    bio: allInfo.bio,
    communities: allInfo.communities,
    favorites: allInfo.favorites,
    posts: allInfo.posts,
  };

  res.status(200).json({
    successMessage: "here ya go silly",
    user: refinedInfo,
  });
});

// get all usernames=====================================
router.get("/usernames", async (req, res) => {
  const allInfo = await prisma.user.findMany();
  const usernames = allInfo.map((user) => {
    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
    };
  });

  res.json({
    successMessage: "all usernames returned",
    allUsers: usernames,
  });
});

// get all users==========ADMIN ONLY=====================

router.get("/all/info", async (req, res) => {
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      username: true
    },
  });

  res.status(200).json({
    successMessage: "all active users",
    users: allUsers,
  });
});

// delete a user=========ADMIN OR EXISTIING USER========

router.delete("/delete/:id", tokenAuth, async (req, res) => {
  const isAdmin = req.isAdmin;
  const userId = req.userId;
  const id = +req.params.id;

  try {
    const userExists = await prisma.user.findUnique({ where: { id } });
    if (!userExists) {
      return res.status(404).json({
        error: "No Existing User To Delete",
      });
    }
    const placementUserId = await prisma.user.findUnique({
      where: { username: "Deleted User" },
    });
    if (!placementUserId) {
      return res.json({
        error: "no placementUserId found",
      });
    }
    const deleteFav = await prisma.favorites.deleteMany({
      where: { userId: id },
    });
    const deleteCom = await prisma.comment.deleteMany({
      where: { userId: id },
    });
    if (isAdmin || userId === id) {
      const replacePost = await prisma.post.updateMany({
        where: { userId: id },
        data: { userId: placementUserId.id },
      });
      console.log("replacement => ", replacePost);
      const user = await prisma.user.delete({
        where: { id },
      });
      return res.status(200).json({
        successMessage: "userDeleted",
        user: user,
      });
    } else {
      return res.status(401).json({
        error: "Not Auth",
      });
    }
  } catch (error) {
    console.log("error here =>", error);
  }
});

// update a user=====================================

router.put("/update/:id", tokenAuth, async (req, res) => {
  const isAdmin = req.isAdmin;
  const userId = req.userId;
  const id = +req.params.id;

  const userExists = await prisma.user.findUnique({ where: { id } });
  if (!userExists) {
    return res.status(404).json({
      error: "No Existing User to Update",
    });
  }
  const { email, username, password, avatar, fName, lName, bio } = req.body;
  let hashedPassword = undefined;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  if (isAdmin || userId === id) {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email,
        username,
        password: hashedPassword || userExists.password,
        avatar,
        fName,
        lName,
        bio,
      },
    });

    res.status(200).json({
      successMessage: "User Update",
      oldData: userExists,
      updatedData: updatedUser,
    });
  } else {
    return res.status(403).json({
      error: "Not Auth",
    });
  }
});

// user adding a community to their feed ==============
router.post(`/join-game/:id`, tokenAuth, async (req, res) => {
  const userId = req.userId;
  const communityId = +req.params.id;
  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { communities: true },
    });
    if (!existingUser) {
      return res.status(404).json({
        error: "no found user",
      });
    }
    const existingComm = await prisma.gameCommunity.findUnique({
      where: { id: communityId },
    });
    if (!existingComm) {
      return res.status(404).json({
        error: "no game found",
      });
    }
    const existingConnection = existingUser.communities.some(
      (comm) => comm.id === communityId
    );
    if (existingConnection) {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          communities: {
            disconnect: { id: communityId },
          },
        },
      });
      return res.json({
        successMessage: "user community relation deleted",
        data: user,
      });
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        communities: {
          connect: { id: communityId },
        },
      },
    });
    res.json({
      successMessage: "user community relation created",
      data: user,
    });
  } catch (error) {
    console.log(error);
  }
});

// admin update ========================================

router.patch("/upgrade/:id", tokenAuth, async (req, res) => {
  const id = +req.params.id;
  const isAdmin = req.isAdmin;

  const userExists = await prisma.user.findUnique({ where: { id } });
  if (!userExists) {
    return res.status(404).json({
      error: "No User To Upgrade",
    });
  }
  if (id === 1) {
    return res.status(403).json({
      error: "Cannot downgrade Owner",
    });
  }
  if (!isAdmin) {
    return res.status(403).json({
      error: "Missing Admin Privilege",
    });
  }
  const upgradedUser = await prisma.user.update({
    where: { id },
    data: { isAdmin: !userExists.isAdmin },
  });

  if (upgradedUser.isAdmin) {
    res.status(200).json({
      successMessage: "User Successfully Upgraded To Admin",
    });
  } else {
    return res.status(200).json({
      successMessage: "User Successfuly Downgraded",
      user: upgradedUser,
    });
  }
});

// change your avatar ========================================
router.patch('/avatar', tokenAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Accept either an S3 key or a full URL
    const { avatarKey, avatarUrl } = req.body;
    if (!avatarKey && !avatarUrl) {
      return res
        .status(400)
        .json({ error: 'Provide either avatarKey or avatarUrl' });
    }

    // Fetch the user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If they already had a non-default S3 avatar, delete old object
    if (
      user.avatar &&
      user.avatar !== DEFAULT_AVATAR_URL &&
      user.avatar.includes(`${BUCKET}.s3.${REGION}.amazonaws.com/`)
    ) {
      const match   = user.avatar.match(/\/([^/]+)$/);
      const oldKey  = match?.[1];
      if (oldKey) {
        await s3.send(
          new DeleteObjectCommand({ Bucket: BUCKET, Key: oldKey })
        );
      }
    }

    // Determine the new avatar URL
    const newAvatar = avatarKey
      ? buildPublicUrl(avatarKey)
      : avatarUrl;

    // Update in database
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: newAvatar },
    });

    // Return the new URL
    return res.status(200).json({
      successMessage: 'Avatar updated successfully',
      avatar: newAvatar,
    });
  } catch (err) {
    next(err);
  }
});

// !!!!!JASON added this, the get user info by id function is for fetching the currently logged in users info!!!!!// also, i moved it to the very bottom because if it reads this first then My Account page breaks.
router.get("/:id", async (req, res) => {
  const userId = Number(req.params.id);

  if (!userId) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { communities: true, favorites: true, posts: {
      include: {
        likes: true
      }
    }},
  });

  if (!user) {
    return res.status(404).json({ error: "No user found" });
  }

  const refinedUser = {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    fName: user.fName,
    lName: user.lName,
    createdAt: user.createdAt,
    favorites: user.favorites,
    posts: user.posts,
    bio: user.bio
  };

  res.status(200).json({
    successMessage: "User profile retrieved",
    user: refinedUser,
  });
});

// !reset your avatar
// router.put('/:id/avatar/reset', /* tokenauth, */ async (req, res, next) => {
//     try {
//         const id = +req.params.id
//         if (!id) return res.status(400).json({ error: 'ID not found / invalid' })

//         await prisma.user.update({
//             where: { id },
//             data: { avatar: defaultAvatar }
//         })

//         res.status(200).json({ successMessage: "Avatar reset successfully" })
//     } catch (error) {
//         next(error)
//     }
// })

// user to delete his/her own post
router.delete("/post/:id", tokenAuth, async (req, res) => {
  const id = +req.params.id;
  const userId = req.userId;
  const post = await prisma.post.findUnique({
    where: { id },
  });
  if (!post) {
    return res.status(404).json({ error: "No post found" });
  }
  if (post.userId !== userId) {
    return res
      .status(403)
      .json({ error: "Not authorized to delete this post" });
  }
  await prisma.post.delete({
    where: { id },
  });
  res.status(200).json({ successMessage: "Post deleted successfully" });
});

module.exports = router;
