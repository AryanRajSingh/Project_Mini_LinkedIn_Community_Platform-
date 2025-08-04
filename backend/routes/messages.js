const express = require('express');
const router = express.Router();
const db = require('../db');           // your existing db connection
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Authentication required" });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
}

// Send a message
router.post('/', authenticateToken, async (req, res) => {
  const senderId = req.user.userId;
  const { receiverId, content } = req.body;

  if (!receiverId || !content || content.trim() === '') {
    return res.status(400).json({ message: "Receiver and content are required" });
  }

  try {
    // Verify receiver exists
    const [users] = await db.query("SELECT id FROM users WHERE id = ?", [receiverId]);
    if (users.length === 0) return res.status(404).json({ message: "Receiver not found" });

    await db.query(
      "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
      [senderId, receiverId, content.trim()]
    );
    res.status(201).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch messages between the logged-in user and another user
router.get('/:userId', authenticateToken, async (req, res) => {
  const userId1 = req.user.userId;
  const userId2 = req.params.userId;

  try {
    const [messages] = await db.query(`
      SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at, u.name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY m.created_at ASC
    `, [userId1, userId2, userId2, userId1]);

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
