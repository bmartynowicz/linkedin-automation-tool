const sqlite3 = require('sqlite3').verbose();
const dbPath = './database/app.db'; // Adjust the path if necessary

// Default preferences
const defaultPreferences = {
  theme: 'light',
  tone: 'professional',
  writing_style: 'brief',
  engagement_focus: 'comments',
  vocabulary_level: 'simplified',
  content_type: 'linkedin-post',
  content_perspective: 'first-person',
  notification_settings: JSON.stringify({
    suggestion_readiness: false,
    engagement_tips: false,
    system_updates: false,
    frequency: 'realtime',
  }),
  language: 'en',
  data_sharing: false,
  auto_logout: false,
  save_session: false,
  font_size: 16,
  text_to_speech: false,
  emphasis_tags: '',
};

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Failed to connect to the database:', err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
});

// Backfill preferences for existing users
const backfillPreferences = () => {
  db.serialize(() => {
    db.each(
      'SELECT id FROM users',
      [],
      (err, row) => {
        if (err) {
          console.error('Error fetching user:', err.message);
          return;
        }

        const userId = row.id;
        console.log(`Checking preferences for user ID: ${userId}`);

        // Check if user preferences already exist
        db.get(
          'SELECT 1 FROM user_preferences WHERE user_id = ?',
          [userId],
          (err, existing) => {
            if (err) {
              console.error('Error checking preferences:', err.message);
              return;
            }

            if (existing) {
              console.log(`Preferences already exist for user ID: ${userId}`);
              return;
            }

            // Insert default preferences
            const query = `
              INSERT INTO user_preferences (
                user_id, theme, tone, writing_style, engagement_focus, 
                vocabulary_level, content_type, content_perspective, notification_settings, 
                language, data_sharing, auto_logout, save_session, font_size, 
                text_to_speech, emphasis_tags, updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;

            db.run(
              query,
              [
                userId,
                defaultPreferences.theme,
                defaultPreferences.tone,
                defaultPreferences.writing_style,
                defaultPreferences.engagement_focus,
                defaultPreferences.vocabulary_level,
                defaultPreferences.content_type,
                defaultPreferences.content_perspective,
                defaultPreferences.notification_settings,
                defaultPreferences.language,
                defaultPreferences.data_sharing,
                defaultPreferences.auto_logout,
                defaultPreferences.save_session,
                defaultPreferences.font_size,
                defaultPreferences.text_to_speech,
                defaultPreferences.emphasis_tags,
              ],
              (err) => {
                if (err) {
                  console.error(`Error inserting preferences for user ID ${userId}:`, err.message);
                } else {
                  console.log(`Default preferences inserted for user ID ${userId}.`);
                }
              }
            );
          }
        );
      }
    );
  });
};

// Start backfilling
backfillPreferences();

db.close((err) => {
  if (err) {
    console.error('Error closing the database:', err.message);
  } else {
    console.log('Database connection closed.');
  }
});
