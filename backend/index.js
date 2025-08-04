const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// Import route handlers
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');
const commentsRouter = require('./routes/comments'); // if you have comments route
const notificationsRouter = require('./routes/notifications');
const messagesRouter = require('./routes/messages');
const friendRequestsRouter = require('./routes/friendRequests');
const adminAuthRouter = require('./routes/adminAuth');
const adminRouter = require('./routes/admin');



// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve uploads folder statically for media files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register routes
app.use('/friend-requests', friendRequestsRouter);
app.use('/admin', adminRouter);
app.use('/adminAuth', adminAuthRouter);
app.use('/notifications', notificationsRouter);
app.use('/messages', messagesRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/posts', postsRouter);
if (commentsRouter) {
  app.use('/comments', commentsRouter);
}
app.use(cors({
  origin: "http://localhost:3000", 
  credentials: true
}));

// Health check route
app.get('/', (req, res) => {
  res.send('Welcome to Mini LinkedIn API');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
