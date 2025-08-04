const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';

// Admin registration
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: 'Name, email and password are required' });

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length)
      return res.status(409).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'admin']
    );

    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (err) {
    console.error('Admin registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin']);
    if (users.length === 0)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = users[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
