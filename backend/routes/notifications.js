// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    // Likes by others on your posts
    const [likes] = await db.query(
      `SELECT pl.user_id as likerId, u.name as likerName, pl.post_id, p.content as postContent, pl.created_at as likedAt
       FROM post_likes pl
       JOIN posts p ON pl.post_id = p.id
       JOIN users u ON pl.user_id = u.id
       WHERE p.user_id = ? AND pl.user_id != ?
       ORDER BY pl.created_at DESC
       LIMIT 50`,
      [userId, userId]
    );
    // Comments by others on your posts
    const [comments] = await db.query(
      `SELECT c.user_id as commenterId, u.name as commenterName, c.post_id, p.content as postContent, c.content as commentText, c.created_at as commentedAt
       FROM comments c
       JOIN posts p ON c.post_id = p.id
       JOIN users u ON c.user_id = u.id
       WHERE p.user_id = ? AND c.user_id != ?
       ORDER BY c.created_at DESC
       LIMIT 50`,
      [userId, userId]
    );
    res.json({ likes, comments });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
});

module.exports = router;
