// database/database.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Derive the directory name and file path
const dbPath = path.resolve(__dirname, 'app.db');

console.log('Database path:', dbPath);

// Create and connect to the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

/**
 * Initializes the database by creating necessary tables if they do not exist.
 */
function initializeDatabase() {
  db.serialize(() => {
    // Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        linkedin_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT,
        access_token TEXT NOT NULL,
        refresh_token TEXT, -- Added for storing LinkedIn refresh token
        expires_in INTEGER, -- Added to store token validity duration
        token_creation_time DATETIME, -- Added to track token generation time
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Roles Table
    db.run(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_name TEXT UNIQUE NOT NULL,
        permissions JSON
      )
    `);

    // Posts Table
    db.run(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL, -- Use for internal relations
        linkedin_id TEXT NOT NULL, -- Use for external references
        title TEXT, 
        content TEXT NOT NULL,
        status TEXT CHECK(status IN ('draft', 'scheduled', 'posted', 'closed')) NOT NULL DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        edited_at DATETIME,  -- For last edited timestamp
        linkedin_post_id TEXT, -- <--- NEW: to store LinkedIn's returned ID
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(linkedin_id) REFERENCES users(linkedin_id) ON DELETE CASCADE
      )
    `);

    // Schedules Table
    db.run(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        scheduled_time DATETIME NOT NULL,
        recurrence TEXT,
        status TEXT DEFAULT 'Scheduled',
        UNIQUE(post_id),
        FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);

    // Analytics Table
    db.run(`
      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER,
        engagement_metrics TEXT,
        follower_growth INTEGER,
        reach INTEGER,
        impressions INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);

    // AI Suggestions Table
    db.run(`
      CREATE TABLE IF NOT EXISTS ai_suggestions (
        suggestion_id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER,
        suggested_text TEXT NOT NULL,
        accepted BOOLEAN DEFAULT FALSE,
        feedback TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);

    // Notifications Table
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        message TEXT NOT NULL,
        type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // User Preferences Table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        theme TEXT DEFAULT 'light',
        notification_settings TEXT DEFAULT '{}', -- JSON string for notification settings
        language TEXT DEFAULT 'en',
        data_sharing BOOLEAN DEFAULT 0,
        auto_logout BOOLEAN DEFAULT 0,
        save_session BOOLEAN DEFAULT 0,
        font_size INTEGER DEFAULT 16,
        text_to_speech BOOLEAN DEFAULT 0,
        tone TEXT DEFAULT 'professional',
        writing_style TEXT DEFAULT 'brief',
        engagement_focus TEXT DEFAULT 'comments',
        vocabulary_level TEXT DEFAULT 'simplified',
        content_type TEXT DEFAULT 'linkedin-post',
        content_perspective TEXT DEFAULT 'first-person',
        emphasis_tags TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Tags Table
    db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `);

    // Post-Tags Relationship Table
    db.run(`
      CREATE TABLE IF NOT EXISTS post_tags (
        post_id INTEGER,
        tag_id INTEGER,
        PRIMARY KEY (post_id, tag_id),
        FOREIGN KEY(post_id) REFERENCES posts(id),
        FOREIGN KEY(tag_id) REFERENCES tags(tag_id)
      )
    `);

    // Recurring Schedules Table
    db.run(`
      CREATE TABLE IF NOT EXISTS recurring_schedules (
        schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER,
        recurrence_pattern TEXT,
        start_date DATETIME NOT NULL,
        end_date DATETIME,
        FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);

    // Create Indexes for Performance Optimization
    db.run(`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_schedules_post_id ON schedules(post_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_post_id ON analytics(post_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id)`);

    console.log('Database tables initialized.');
  });
}

// Export the database instance for use in other modules
module.exports = db;
