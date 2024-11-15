const db = require('./database');

const getAllPosts = (callback) => {
  db.all('SELECT * FROM posts', [], callback);
};

const createPost = (post, callback) => {
  const { title, content, userId } = post;
  db.run(
    'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
    [userId, title, content],
    callback
  );
};

module.exports = { getAllPosts, createPost };
