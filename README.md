LinkedIn Mini Project
Project Overview
This is a full-stack web application inspired by LinkedIn, developed with modern technologies. It allows users to create profiles, share posts, send messages, and interact with posts through likes and comments.

Features
---------
User Features
User registration and login with email and password.

Profile creation and editing (except email address cannot be changed).

Creating posts.

Like/unlike posts, add comments, and view comments.

Messaging other users with chat interface.

View other user profiles and start conversations.

Only users can update their own profiles or posts.

Secure password handling with bcrypt hashing.

Tech Stack
------------
Frontend: Next.js (App Router), React with hooks, Axios, CSS-in-JS styling.

Backend: Node.js, Express, MySQL database, bcrypt for password hashing, JWT for authentication.

Storage: Uploaded media stored on server filesystem (with Multer middleware).

Authentication: JWT for stateless sessions, with user roles (user).

Other: CORS middleware for API access from frontend, form and input validation on client and server.

Project Structure
text

/Mini_LinkedIn_like_Community_Platform
/backend
  /routes
    auth.js           # User auth routes (register/login)
    users.js          # User CRUD 
    posts.js          # Posts CRUD, comments, likes
    friendRequests.js # Friend request management
    messages.js       # Messaging API
  /uploads            # Uploaded media storage folder
  db.js               # MySQL connection configuration
  index.js            # Express app main entry
/frontend
  /app
    /register          # User registration page
    /login             # User login page
    /profile
      [id]
        index          # User profile page
        edit           # Profile edit page
    /chat
      [id]             # Chat page for messaging user with id
    /notifications     # Notifications page
    /friend-requests   # Incoming friend requests page
    /users             # All user profiles list
  /components
    Navbar             # Navigation bar
    PostCard           # Renders one post with all interaction UI
    MessageForm        # Message sending form UI
    MessagesList       # Message displaying list UI
    EmailInput         # Reusable email input with validation
    (other reusable UI components)
  public               # Static assets
  styles               # Global styles or theme

Setup Instructions
------------------
Backend
--------
Navigate to backend directory.

Install dependencies:

bash
npm install
Configure .env file with:

Run the backend server:
-------------------------
bash
npm run dev
Frontend
Navigate to frontend directory.

Install dependencies:

bash
----
npm install
Run frontend:

bash
----
npm run dev
Access the app at http://localhost:3000

Usage
-----
Users can register and login from /register and /login.

Logged-in users can create, edit and delete their own posts.

Messaging available via chat pages at /chat/[userId].

User profiles browsed at /users and /profile/[userId].

Notes
-----
Password hashing secures user passwords.

JWT tokens handle authentication and roles.

Multer middleware handles file uploads with proper limits.

CORS is enabled so frontend can call backend endpoints.

Deletion of users cascades or requires deleting associated posts due to foreign keys.

