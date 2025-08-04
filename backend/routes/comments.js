const express = require('express');
const router = express.Router();
const db = require('../db');  // Your DB connection
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

// JWT authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authentication token required' });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// GET comments for a post
router.get('/post/:postId', async (req, res) => {
  const { postId } = req.params;
  try {
    const [comments] = await db.query(`
      SELECT comments.id, comments.content, comments.created_at, users.name AS user_name
      FROM comments
      JOIN users ON comments.user_id = users.id
      WHERE comments.post_id = ?
      ORDER BY comments.created_at ASC
    `, [postId]);

    res.json(comments);
  } catch (err) {
    console.error('Failed to get comments:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST new comment (authenticated)
router.post('/post/:postId', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length === 0 || content.length > 300) {
    return res.status(400).json({ message: 'Comment content is required and maximum 300 characters allowed' });
  }

  try {
    await db.query('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', [
      postId,
      req.user.userId,
      content.trim(),
    ]);
    res.status(201).json({ message: 'Comment added' });
  } catch (err) {
    console.error('Failed to add comment:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
