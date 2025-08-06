require('dotenv').config()
const prisma = require("../prisma");
const bcrypt = require("bcrypt");
const PASSWORD = process.env.PASSWORD

const seed = async () => {
  // Clear Seeded Data ====================================

  await prisma.comment.deleteMany();
  await prisma.favorites.deleteMany();
  await prisma.like.deleteMany();
  await prisma.post.deleteMany();
  await prisma.gameCommunity.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.user.deleteMany();

  // Users================================================
  async function createUser() {
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    // Admin user
    await prisma.user.create({
      data: {
        email: "admin@admin.com",
        username: "superkai64",
        password: hashedPassword,
        avatar: `https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/pfp/superKai.jpg`,
        bio: "THIS IS THE MOST POWERFUL ACCOUNT KNOWN TO MAN!!!!",
        isAdmin: true,
      },
    });

    // Full Name Test w/ Avatar
    await prisma.user.create({
      data: {
        email: "deleted@user.com",
        username: "Deleted User",
        password: hashedPassword,
        avatar: `https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/pfp/deleted-user.jpg`,
        bio: "Grave yard of the fallen",
      },
    });

    console.log("Users seeded");
  }
  const aws_url = 'https://forgexp-bucket.s3.us-east-2.amazonaws.com'
  // Game community=========================
  async function createGames() {
    await prisma.gameCommunity.createMany({
      data: [
        {
          gameName: "Elden Ring",
          description:
            "A triumphant open-world Soulslike with awe-inspiring bosses and exploration. Demanding yet deeply rewarding, albeit with occasional repetition.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-elden-ring.jpg",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-elden-ring.png",
        },
        { //Jason Added
          gameName: "Ghost Recon Break Point",
          description:
            "Tom Clancy's Ghost Recon Breakpoint is an open-world tactical shooter where you, as elite operative Nomad, must survive and dismantle a rogue military force on the high-tech island of Auroa.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-breakpoint.png",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-breakpoint.jpg",
        },
        {
          gameName: "Baldur's Gate III",
          description:
            "A masterpiece of choice-driven storytelling with deep combat, unforgettable characters, and staggering reactivity. Sets a new bar for CRPGs.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-baldurs-gate-iii.png",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-baldurs-gate-iii.png",
        },
        {
          gameName: "Counter-Strike 2",
          description:
            "The definitive tactical shooter evolves with upgraded visuals and smoke mechanics, retaining its ultra-competitive core. Server issues and missing features frustrate veterans, but its polished gunplay remains unmatched.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-counter-strike-2.png",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-counter-strike-2.png",
        },
        {
          gameName: "Helldivers 2",
          description:
            "Chaotic, satirical fun with frenetic team-based action. Friendly fire and stratagems create hilarious (and brutal) moments, though progression grinds late-game.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-hell-divers-2.png",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-hell-divers-2.png",
        },
        {
          gameName: "Stardew Valley",
          description:
            "A timeless, heartwarming escape with farming, mining, and relationships. Continues to charm with endless content and mod support.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-stardew-valley.png",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-stardew-valley.png",
        },
        {
          gameName: "Call of Duty: Modern Warfare III",
          description:
            "Solid gunplay and a strong multiplayer suite are marred by a rushed campaign and aggressive monetization. For diehard fans only.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-call-of-duty-modern-warfare-3.jpg",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-call-of-duty-modern-warfare-3.png",
        },
        {
          gameName: "Cyberpunk 2077",
          description:
            "Redeemed by 2.0 and Phantom Liberty, offering a gripping narrative, improved gameplay, and Night City’s dazzling immersion.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-cyberpunk-2077.png",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-cyberpunk-2077.png",
        },
        {
          gameName: "PUBG: BATTLEGROUNDS",
          description:
            "The BR pioneer remains tense and tactical, though clunky movement and dated visuals show its age next to competitors.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-pubg-battlegrounds.png",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-pubg-battlegrounds.png",
        },
        {
          gameName: "Apex Legends",
          description:
            "Fast-paced, movement-driven combat with stellar gunplay, but hampered by uneven balance and a steep learning curve.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-apex.jpg",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-apex.png",
        },
        {
          gameName: "Grand Theft Auto V",
          description:
            "A decade later, its world and chaos still entertain, though re-releases test patience. Online mode’s grind overshadows its brilliance.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-grand-theft-auto-v.jpg",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-grand-theft-auto-v.png",
        },
        {
          gameName: "Dota 2",
          description:
            "The pinnacle of competitive MOBAs with unmatched depth and strategy. Steep learning curve and toxic community can deter newcomers, but its free-to-play model and ever-evolving meta keep it thriving.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-dota-2.png",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-dota-2.png",
        },
        {
          gameName: "Lost Ark",
          description:
            "A visually stunning ARPG-MMO hybrid with satisfying combat and tons of content. Hampered by grind-heavy endgame and aggressive monetization, but a blast for casual play.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-lost-ark.jpg",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-lost-ark.jpg",
        },
        {
          gameName: "Destiny 2",
          description:
            "Superb gunplay and epic raids make it a shooter standout, but convoluted storytelling and relentless monetization frustrate. Best with friends.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-destiny-2.png",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-destiny-2.jpg",
        },
        {
          gameName: "Hogwarts Legacy",
          description:
            "A magical open-world love letter to Harry Potter fans, packed with charm but held back by shallow RPG mechanics and repetitive tasks.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-hogwarts.png",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-hogwarts.jpg",
        },
        {
          gameName: "Palworld",
          description:
            "'Pokémon with guns' delivers addicting base-building and creature-catching, though janky AI and repetitive gameplay show its early-access roots.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-palworld.png",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-palworld.jpg",
        },
        {
          gameName: "Team Fortress 2",
          description:
            "The free-to-play pioneer still delivers chaotic 12v12 battles with unmatched personality. While lacking updates, its perfect class balance and timeless art style keep it thriving 17 years later.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-team-fortress-2.jpg",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-team-fortress-2.jpg",
        },
        {
          gameName: "Rust",
          description:
            "A brutal social experiment where naked players club each other for scrap metal. The ultimate high-stakes survival experience, though the learning curve is vertical and toxicity runs rampant.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-rust.png",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-rust.jpg",
        },
        {
          gameName: "Terraria",
          description:
            "The ultimate 2D sandbox with staggering depth - fight eldritch horrors one minute, build a floating castle the next. Regular free updates put AAA studios to shame.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-terraria.png",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-terarria.png",
        },
        {
          gameName: "War Thunder",
          description:
            "The most comprehensive vehicle combat sim, featuring everything from WWII biplanes to modern tanks. Grindy monetization mars otherwise stellar realistic battles.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-war-thunder.jpg",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-war-thunder.jpg",
        },
        {
          gameName: "Monster Hunter: World",
          description:
            "Hunting behemoths has never felt this good - each weapon plays like its own game, and monsters are living ecosystems. The perfect mix of methodical and monstrous.",
          coverImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/cover-monster-hunter-world.png",
          heroImage: "https://forgexp-bucket.s3.us-east-2.amazonaws.com/images/games/hero-monster-hunter-world.png",
        },
      ],
    });

    console.log("Game Communities seeded");
  }

  // post community ==========================
  // async function createPosts() {
  //   const user = await prisma.user.findMany();
  //   const community = await prisma.gameCommunity.findMany();

  //   await prisma.post.createMany({
  //     data: [
  //       {
  //         title: "Loved it!",
  //         description: "Amazing open-world and challenging bosses.",
  //         PostType: "text",
  //         userId: user[0].id,
  //         communityId: community[0].id,
  //       },
  //       {
  //         title: "Very cinematic",
  //         description: "Incredible acting and writing.",
  //         PostType: "text",
  //         userId: user[1].id,
  //         communityId: community[1].id,
  //       },
  //       {
  //         title: "Addictive gameplay",
  //         description: "Super charming and fun.",
  //         PostType: "text",
  //         userId: user[2].id,
  //         communityId: community[2].id,
  //       },
  //       {
  //         title: "Insane boss fight",
  //         content: "https://www.youtube.com/watch?v=D_iqjI2p7F4",
  //         description: "Malenia: 'I have never known defeat'.",
  //         PostType: "video",
  //         userId: user[1].id,
  //         communityId: community[0].id,
  //       },
  //     ],
  //   });

  //   console.log("Posts seeded");
  // }

  // Comments================================
  // async function createComments() {
  //   const user = await prisma.user.findMany();
  //   const post = await prisma.post.findMany();

  //   await prisma.comment.createMany({
  //     data: [
  //       {
  //         body: "Agree! This game was awesome.",
  //         postId: post[0].id,
  //         userId: user[1].id,
  //         likes: 3,
  //       },
  //       {
  //         body: "I was impressed by the graphics.",
  //         postId: post[1].id,
  //         userId: user[2].id,
  //         likes: 2,
  //       },
  //       {
  //         body: "One of the best I have played.",
  //         postId: post[2].id,
  //         userId: user[1].id,
  //         likes: 5,
  //       },
  //     ],
  //   });

  //   console.log("Comments seeded");
  // }

  // // Favorites============================
  // async function createFavorites() {
  //   const user = await prisma.user.findMany();
  //   const post = await prisma.post.findMany();

  //   await prisma.favorites.createMany({
  //     data: [
  //       {
  //         userId: user[1].id,
  //         postId: post[0].id,
  //       },
  //       {
  //         userId: user[2].id,
  //         postId: post[1].id,
  //       },
  //       {
  //         userId: user[1].id,
  //         postId: post[2].id,
  //       },
  //     ],
  //   });

  //   console.log("Favorites seeded");
  // }

  // Run all
  await createUser();
  await createGames();
  // await createPosts();
  // await createComments();
  // await createFavorites();
};

seed()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
