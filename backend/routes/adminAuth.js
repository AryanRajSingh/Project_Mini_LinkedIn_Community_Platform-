const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const jwtSecret = process.env.JWT_SECRET;

// Admin Registration
router.post('/register', async (req, res) => {
  const { name, email, password, bio } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  try {
    // Check if email registered
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert with role 'admin'
    await db.query(
      'INSERT INTO users (name, email, password, bio, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, bio || null, 'admin']
    );

    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (err) {
    console.error('Admin registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Login (same as normal but verifies role)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = users[0];
    if (user.role !== 'admin')
      return res.status(403).json({ message: 'Access denied: Admins only' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'Invalid credentials' });

    // Generate JWT token (include role)
    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      jwtSecret,
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
