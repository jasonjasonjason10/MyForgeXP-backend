const express = require('express')
const tokenAuth = require('../middleware/TokenAuth')
const prisma = require('../../prisma')
const router = express.Router()

// Fav post toggle================
router.post('/favorite/:id', tokenAuth, async (req, res) => {
    const userId = req.userId
    const postId = +req.params.id

    const existingPost = await prisma.post.findUnique({
        where: {id: postId}
    })
    if(!existingPost){
        return res.status(404).json({
            error: 'no post found'
        })
    }
    const existingRelation = await prisma.favorites.findUnique({
        where: {
            userId_postId: {userId, postId}
        }
    })
    if(existingRelation){
        await prisma.favorites.delete({
            where: {
                userId_postId: {userId, postId}
            }
        })
        return res.json({
            successMessage: 'favorite relation destroyed',
            data: existingRelation
        })
    } else {
        const relation = await prisma.favorites.create({
            data: {userId, postId}
        })
        res.json({
            successMessage: 'favorite relation created',
            data: relation
        })
    }
})

// get all user favorites ================
router.post('/favorites', tokenAuth, async (req, res) => {
    const userId = req.userId

    const favorites = await prisma.favorites.findMany({
        where: {userId},
        include: {
            post: {
                include: {
                    user: {
                        select: {
                            username: true
                        }
                    },
                    likes: true
                }
            }
        }
    })
    const posts = favorites.map((post) => (
        post.post
    ))
    res.json({
        successMessage: 'returning all user favorites',
        posts
    })
})

// user fav check ============
router.post('/hasfav/:id', tokenAuth, async (req, res) => {
    const userId = req.userId
    const postId = +req.params.id
    const post = await prisma.favorites.findUnique({
        where: {userId_postId: {userId, postId}}
    })
    if(post){
        res.json({
            boolean: true
        })
    }else {
        res.json({
            boolean:false
        })
    }

})

module.exports = router