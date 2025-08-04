const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const jwtSecret = process.env.JWT_SECRET;

// Middleware to authenticate JWT token
function authenticateAdminToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authentication token required' });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    if (user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    req.user = user;
    next();
  });
}

router.delete('/:id', authenticateAdminToken, async (req, res) => {
  const userId = req.params.id;
  try {
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });

    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'User deleted by admin' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}); 
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

// Get all users (without passwords)
router.get('/', async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, bio FROM users');
    res.json(users);
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile by id (without password)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [users] = await db.query('SELECT id, name, email, bio FROM users WHERE id = ?', [id]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(users[0]);
  } catch (err) {
    console.error('Get user by id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile (authenticated)
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, bio, currentPassword, newPassword } = req.body;

  // Only allow user to update their own profile
  if (req.user.userId != id) {
    return res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
  }

  try {
    // Get current user info
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = users[0];

    // Verify currentPassword for sensitive updates (email, name, password)
    if (newPassword || email !== user.email || name !== user.name) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to update sensitive info' });
      }
      
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(400).json({ message: 'Current password incorrect' });
      }
    }

    // Check if name or email already used by someone else
    if (email !== user.email || name !== user.name) {
      const [existingUsers] = await db.query(
        'SELECT id FROM users WHERE (email = ? OR name = ?) AND id != ?',
        [email, name, id]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'Email or name already in use by another user' });
      }
    }

    // Hash newPassword if provided, else keep old password
    const hashedPassword = newPassword ? await bcrypt.hash(newPassword, 10) : user.password;

    // Update user information
    await db.query(
      'UPDATE users SET name = ?, email = ?, bio = ?, password = ? WHERE id = ?',
      [name, email, bio || null, hashedPassword, id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user profile and their posts (authenticated)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (req.user.userId != id) {
    return res.status(403).json({ message: 'Forbidden: You can only delete your own profile' });
  }

  try {
    // Delete user's posts first
    await db.query('DELETE FROM posts WHERE user_id = ?', [id]);

    // Then delete user profile
    await db.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'User and all posts deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
