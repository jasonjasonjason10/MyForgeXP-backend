const express = require('express')
const router = express.Router()

// get all comments for a post
router.get('/:postId/comments', async (req, res, next) => {
    try {
        const postId =+ req.params.postId
        if (!postId) return res.sendStatus(400).json({ error: 'Post not found / Post ID invalid' })
        
        const response = await prisma.comments.findMany({ where: postId})

        if(comments.length === 0) return res.json({ error: 'This post has no comments' })

        res.sendStatus(200).json(response)
    } catch (error) {
        next(error)
    }
})

module.exports = router