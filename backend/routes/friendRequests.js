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

// Send friend request
router.post('/send', authenticateToken, async (req, res) => {
  const senderId = req.user.userId;
  const { receiverId } = req.body;

  if (!receiverId || senderId === receiverId) {
    return res.status(400).json({ message: 'Invalid receiver ID' });
  }

  try {
    // Check if request already exists or if they are already friends
    const [existing] = await db.query(
      'SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ?',
      [senderId, receiverId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Insert friend request
    await db.query(
      'INSERT INTO friend_requests (sender_id, receiver_id) VALUES (?, ?)',
      [senderId, receiverId]
    );

    res.status(201).json({ message: 'Friend request sent' });
  } catch (err) {
    console.error('Send friend request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get received friend requests
router.get('/received', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [requests] = await db.query(
      `SELECT fr.id, fr.sender_id, u.name AS sender_name, fr.status, fr.created_at
       FROM friend_requests fr
       JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id = ? AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );
    res.json(requests);
  } catch (err) {
    console.error('Get received friend requests error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Respond to friend request (accept/reject)
router.post('/respond', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { requestId, action } = req.body; // action: 'accept' or 'reject'

  if (!requestId || !['accept', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    // Verify request exists and belongs to current user
    const [requests] = await db.query(
      'SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = "pending"',
      [requestId, userId]
    );
    if (requests.length === 0) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Update status
    await db.query(
      'UPDATE friend_requests SET status = ? WHERE id = ?',
      [action === 'accept' ? 'accepted' : 'rejected', requestId]
    );

    // If accepted, optionally insert into a friends table (if you want to track friendships separately)
    if (action === 'accept') {
      // example insert into friends table, if you have one
      // await db.query('INSERT INTO friends (user1_id, user2_id) VALUES (?, ?)', [userId, requests[0].sender_id]);
    }

    res.json({ message: `Friend request ${action}ed` });
  } catch (err) {
    console.error('Respond friend request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
