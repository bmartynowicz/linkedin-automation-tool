import express from 'express';
import db from '../database/database.js';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Enable CORS for all routes (Adjust origin as needed for security)
app.use(cors());

// ======= API Endpoints =======

/**
 * @route   POST /api/posts
 * @desc    Create a new post
 * @access  Public (Consider securing with authentication)
 */
app.post('/api/posts', (req, res) => {
  const { userId, title, content } = req.body;

  // Input validation
  if (!userId || !title || !content) {
    return res.status(400).json({ error: 'userId, title, and content are required.' });
  }

  const query = `INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)`;
  const params = [userId, title, content];

  db.run(query, params, function (err) {
    if (err) {
      console.error('Error inserting new post:', err.message);
      return res.status(500).json({ error: 'Failed to create post.' });
    }
    return res.status(201).json({ id: this.lastID });
  });
});

/**
 * @route   GET /api/posts
 * @desc    Retrieve all posts
 * @access  Public (Consider securing with authentication)
 */
app.get('/api/posts', (req, res) => {
  const query = `SELECT * FROM posts`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching posts:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve posts.' });
    }
    return res.status(200).json(rows);
  });
});

/**
 * @route   GET /api/posts/:id
 * @desc    Retrieve a single post by ID
 * @access  Public (Consider securing with authentication)
 */
app.get('/api/posts/:id', (req, res) => {
  const postId = req.params.id;

  const query = `SELECT * FROM posts WHERE id = ?`;
  const params = [postId];

  db.get(query, params, (err, row) => {
    if (err) {
      console.error(`Error fetching post with ID ${postId}:`, err.message);
      return res.status(500).json({ error: 'Failed to retrieve post.' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    return res.status(200).json(row);
  });
});

/**
 * @route   PUT /api/posts/:id
 * @desc    Update a post by ID
 * @access  Public (Consider securing with authentication)
 */
app.put('/api/posts/:id', (req, res) => {
  const postId = req.params.id;
  const { title, content } = req.body;

  // Input validation
  if (!title && !content) {
    return res.status(400).json({ error: 'At least one of title or content must be provided for update.' });
  }

  // Build dynamic query based on provided fields
  let query = 'UPDATE posts SET ';
  const params = [];

  if (title) {
    query += 'title = ?, ';
    params.push(title);
  }

  if (content) {
    query += 'content = ?, ';
    params.push(content);
  }

  // Remove trailing comma and space
  query = query.slice(0, -2);
  query += ' WHERE id = ?';
  params.push(postId);

  db.run(query, params, function (err) {
    if (err) {
      console.error(`Error updating post with ID ${postId}:`, err.message);
      return res.status(500).json({ error: 'Failed to update post.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Post not found or no changes made.' });
    }

    return res.status(200).json({ message: 'Post updated successfully.' });
  });
});

/**
 * @route   DELETE /api/posts/:id
 * @desc    Delete a post by ID
 * @access  Public (Consider securing with authentication)
 */
app.delete('/api/posts/:id', (req, res) => {
  const postId = req.params.id;

  const query = `DELETE FROM posts WHERE id = ?`;
  const params = [postId];

  db.run(query, params, function (err) {
    if (err) {
      console.error(`Error deleting post with ID ${postId}:`, err.message);
      return res.status(500).json({ error: 'Failed to delete post.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    return res.status(200).json({ message: 'Post deleted successfully.' });
  });
});

/**
 * @route   GET /api/analytics
 * @desc    Fetch basic analytics data
 * @access  Public (Consider securing with authentication)
 */
app.get('/api/analytics', (req, res) => {
  const query = `
    SELECT 
      user_id, 
      COUNT(*) AS post_count, 
      MAX(datetime(created_at)) AS last_post_date 
    FROM posts 
    GROUP BY user_id
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching analytics:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve analytics.' });
    }
    return res.status(200).json(rows);
  });
});

// ======= Start the Server =======
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});