// linkedin.js

const axios = require('axios');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer');
const schedule = require('node-schedule');
const db = require('../database/database');
const dotenvExpand = require('dotenv-expand');

dotenv.config();

/**
 * Posts content to LinkedIn using LinkedIn's Official API.
 * 
 * Ensure that the following environment variables are set in your .env file:
 * - LINKEDIN_CLIENT_ID: Your LinkedIn application's Client ID.
 * - LINKEDIN_CLIENT_SECRET: Your LinkedIn application's Client Secret.
 * - LINKEDIN_ACCESS_TOKEN: Your LinkedIn OAuth 2.0 Access Token.
 * 
 * @param {string} content - The content to post on LinkedIn.
 * @returns {Object} - Result of the posting operation.
 */
async function postToLinkedIn(content) {
  try {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN; // Securely manage your access token
    const personURN = process.env.LINKEDIN_PERSON_URN;  

    if (!accessToken || !personURN) {
      console.error('LinkedIn access token or person URN is missing in environment variables.');
      return { success: false, message: 'Missing LinkedIn credentials.' };
    }

    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: `urn:li:person:${personURN}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: content,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    if (response.status === 201) {
      console.log('Post successfully published to LinkedIn.', { content });
      return { success: true };
    } else {
      console.error('Failed to publish post to LinkedIn.', { status: response.status, data: response.data });
      return { success: false, message: response.data };
    }
  } catch (error) {
    console.error('Error in postToLinkedIn:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Schedules existing posts that are marked as 'scheduled' in the database.
 * This function should be called when the application starts.
 */
function scheduleExistingPosts(mainWindow) { // Pass mainWindow to send IPC messages if needed
  db.all("SELECT * FROM posts WHERE status = 'scheduled' AND scheduled_time > datetime('now')", (err, rows) => {
    if (err) {
      console.error('Error fetching scheduled posts:', err.message);
      return;
    }

    rows.forEach((post) => {
      const scheduledTime = new Date(post.scheduled_time);
      if (isNaN(scheduledTime.getTime())) {
        console.error('Invalid scheduled_time for post ID:', post.id);
        return;
      }

      schedule.scheduleJob(scheduledTime, async () => {
        console.log(`Executing scheduled post ID ${post.id} at ${scheduledTime}`);
        try {
          const result = await postToLinkedIn(post.content);
          if (result.success) {
            // Update post status to 'posted'
            db.run("UPDATE posts SET status = 'posted', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [post.id], (err) => {
              if (err) {
                console.error('Error updating post status to posted:', err.message);
              } else {
                console.log('Post successfully posted to LinkedIn.', { id: post.id });
                // Notify renderer about the post being published
                if (mainWindow && mainWindow.webContents) {
                  mainWindow.webContents.send('post-published', post.id);
                }
              }
            });
          } else {
            console.error('Failed to post to LinkedIn.', { id: post.id, error: result.message });
            // Optionally, handle failed scheduling (e.g., retry, notify user)
          }
        } catch (error) {
          console.error('Error posting to LinkedIn during scheduled job:', { error: error.message, id: post.id });
        }
      });

      console.log('Scheduled a post to be posted at:', { id: post.id, scheduled_time: post.scheduled_time });
    });
  });
}

/**
 * Example Function Using Puppeteer for Non-API Supported Functionalities
 * 
 * @param {string} targetUrl - The URL to navigate to.
 */
async function performNonAPIFunctionality(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string') {
    console.error('Invalid URL provided.');
    return;
  }

  try {
    const browser = await puppeteer.launch({
      headless: process.env.PUPPETEER_HEADLESS === 'true',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null,
    });

    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });

    // Implement your Puppeteer logic here...

    console.log(`Performed non-API functionality on ${targetUrl}`);
  } catch (error) {
    console.error('Error performing non-API functionality:', error);
  }
}

module.exports = { postToLinkedIn, scheduleExistingPosts, performNonAPIFunctionality };
