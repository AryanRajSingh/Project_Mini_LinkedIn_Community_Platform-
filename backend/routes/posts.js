const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

// Multer setup for media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this folder exists at backend root
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.userId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed.'));
    }
  },
});

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

// POST /posts — Create a new post (with optional media upload)
router.post('/', authenticateToken, upload.single('media'), async (req, res) => {
  const content = req.body.content || null;
  let mediaPath = null;

  if (!content && !req.file) {
    return res.status(400).json({ message: 'Post content or media is required' });
  }

  if (req.file) {
    mediaPath = req.file.filename;
  }

  try {
    await db.query('INSERT INTO posts (user_id, content, media_path) VALUES (?, ?, ?)', [
      req.user.userId,
      content,
      mediaPath,
    ]);
    res.status(201).json({ message: 'Post created' });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /posts — Get all posts with user info and like counts
router.get('/', async (req, res) => {
  try {
    const [posts] = await db.query(`
      SELECT 
        posts.id, 
        posts.content,
        posts.media_path,
        posts.created_at, 
        users.name, 
        users.id AS user_id,
        (SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = posts.id) AS like_count
      FROM posts
      JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
    `);
    res.json(posts);
  } catch (err) {
    console.error('Get all posts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /posts/user/:userId — Get posts by user with like counts
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [posts] = await db.query(`
      SELECT 
        posts.id, 
        posts.content,
        posts.media_path,
        posts.created_at,
        (SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = posts.id) AS like_count
      FROM posts
      WHERE user_id = ?
      ORDER BY posts.created_at DESC
    `, [userId]);
    res.json(posts);
  } catch (err) {
    console.error('Get user posts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /posts/new-posts?after=ISO_DATE — fetch posts created after given timestamp
router.get('/new-posts', async (req, res) => {
  const after = req.query.after;
  if (!after) return res.status(400).json({ message: 'Missing "after" query parameter' });

  try {
    const [posts] = await db.query(
      `SELECT posts.id, posts.content, posts.media_path, posts.created_at, users.name, users.id AS user_id
       FROM posts
       JOIN users ON posts.user_id = users.id
       WHERE posts.created_at > ?
       ORDER BY posts.created_at DESC`,
      [after]
    );
    res.json(posts);
  } catch (error) {
    console.error('Failed to fetch new posts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /posts/:id — Update a post (owner only)
router.put('/:id', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;

  if (!content) return res.status(400).json({ message: 'Post content required' });

  try {
    const [posts] = await db.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) return res.status(404).json({ message: 'Post not found' });

    if (posts[0].user_id !== req.user.userId)
      return res.status(403).json({ message: 'Forbidden: only owner can edit post' });

    await db.query('UPDATE posts SET content = ? WHERE id = ?', [content, postId]);

    res.json({ message: 'Post updated successfully' });
  } catch (err) {
    console.error('Update post error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /posts/:id — Delete a post (owner only)
// DELETE /posts/:id — Delete a post (owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  const postId = req.params.id;

  try {
    const [posts] = await db.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) return res.status(404).json({ message: 'Post not found' });

    if (posts[0].user_id !== req.user.userId)
      return res.status(403).json({ message: 'Forbidden: only owner can delete post' });

    await db.query('DELETE FROM posts WHERE id = ?', [postId]);

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// POST /posts/:id/like — Like a post
router.post('/:id/like', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const userId = req.user.userId;

  try {
    const [existing] = await db.query(
      'SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Post already liked' });
    }

    await db.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);

    res.json({ message: 'Post liked' });
  } catch (err) {
    console.error('Like post error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /posts/:id/unlike — Unlike a post
router.post('/:id/unlike', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const userId = req.user.userId;

  try {
    const [result] = await db.query(
      'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'You have not liked this post' });
    }

    res.json({ message: 'Post unliked' });
  } catch (err) {
    console.error('Unlike post error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /posts/new?after=ISO_DATE — count new posts after timestamp, for notification badge
router.get('/new', async (req, res) => {
  const after = req.query.after;
  if (!after) return res.status(400).json({ message: 'Missing after query parameter' });

  try {
    const [rows] = await db.query('SELECT COUNT(*) AS count FROM posts WHERE created_at > ?', [after]);
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('Failed to get new posts count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
