const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET; // Your JWT secret from .env

// Register route
router.post('/register', async (req, res) => {
  const { name, email, bio, password } = req.body;

  if (!name || !email || !password || !bio) {
    return res.status(400).json({ message: "Name, email, bio and password are required" });
  }

  try {
    // Check if email already registered
    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    await db.query(
      'INSERT INTO users (name, email, password, bio) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, bio || null]
    );

    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '1d' }
    );

    // Send token and user info (excluding password)
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, bio: user.bio }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
