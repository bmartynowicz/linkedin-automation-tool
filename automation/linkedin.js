// automation/linkedin.js

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const { findOrCreateUser, getCurrentUser, refreshAccessToken } = require('../services/usersService.js');
const { scrapeLinkedInAnalytics } = require('../automation/linkedinScraper.js');

dotenv.config();

/**
 * Function: postToLinkedIn
 * Handles posting content to LinkedIn via UGC API.
 * @param {Object} content - { title: string, body: string }
 * @param {string} accessToken - User's LinkedIn access token
 * @param {string} userId - LinkedIn user ID
 * @returns {Promise<Object>} API Response
 */
async function postToLinkedIn(content, accessToken, userId) {
  const { title, body } = content;

  try {
    // Validate parameters
    if (!userId) throw new Error('LinkedIn User ID is missing.');
    if (!accessToken) throw new Error('Access token is missing.');

    // Make UGC API call to LinkedIn
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: `urn:li:person:${userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: `${title}\n\n${body}` },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('LinkedIn UGC API Error:', responseData);
      throw new Error(responseData.message || 'Failed to post to LinkedIn.');
    }

    console.log('LinkedIn Post Successful:', responseData);
    return { success: true, data: responseData };
  } catch (error) {
    console.error('Error posting to LinkedIn:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Function: getScrapedAnalytics
 * Scrapes LinkedIn analytics and returns the data.
 * @param {string} query - The keyword or hashtag to search for.
 * @returns {Promise<Object>} The scraped analytics data.
 */
async function getScrapedAnalytics(query) {
  try {
    if (!query) throw new Error('Query is required for scraping analytics.');

    const posts = await scrapeLinkedInAnalytics(query);

    // Optionally save analytics to the database
    await Promise.all(posts.map(post => saveAnalytics(post)));

    return { success: true, data: posts };
  } catch (error) {
    console.error('Error in getScrapedAnalytics:', error.message);
    return { success: false, error: error.message };
  }
}

// Route to handle LinkedIn OAuth callback
router.get('/auth/linkedin/callback', async (req, res) => {
  console.log('--- LinkedIn OAuth Callback Received ---');
  console.log('Query Parameters:', req.query);

  const authorizationCode = req.query.code;
  const error = req.query.error;
  const errorDescription = req.query.error_description;

  if (error) {
    console.error('Error during LinkedIn OAuth:', error, '-', errorDescription);
    return res.status(400).json({ error: errorDescription || 'Authorization failed.' });
  }

  if (!authorizationCode) {
    console.warn('Authorization code is missing in the callback request.');
    return res.status(400).json({ error: 'Authorization code is missing.' });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Access Token Response:', tokenData);

    if (tokenData.error) {
      throw new Error(tokenData.error_description || 'Failed to obtain access token.');
    }

    const accessToken = tokenData.access_token;
    console.log('Access Token Obtained:', accessToken);

    // Fetch LinkedIn user profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profileData = await profileResponse.json();
    console.log('User Profile Response:', profileData);

    if (profileData.error) {
      throw new Error(profileData.error.message || 'Failed to fetch LinkedIn profile.');
    }

    const userID = profileData.id;
    const name = `${profileData.localizedFirstName} ${profileData.localizedLastName}`;
    console.log(`User ID: ${userID}, Name: ${name}`);

    // Save user data to the database
    const user = await findOrCreateUser(userID, name, accessToken);
    console.log('User Data Saved:', user);

    res.status(200).json({ message: 'Authentication successful.', user });
  } catch (error) {
    console.error('Error during LinkedIn OAuth callback processing:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/post-to-linkedin', async (req, res) => {
  const { title, body } = req.body;

  try {
    // Fetch the current user's LinkedIn ID and access token from the database
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.linkedin_id || !currentUser.access_token) {
      return res.status(400).json({ error: 'LinkedIn user is not authenticated.' });
    }

    // Call postToLinkedIn function
    const result = await postToLinkedIn({ title, body }, currentUser.access_token, currentUser.linkedin_id);

    if (result.success) {
      res.status(200).json({ message: 'Post successful!', data: result.data });
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error in /post-to-linkedin route:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/analytics/scrape', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required.' });

    const posts = await scrapeLinkedInAnalytics(query);

    // Save analytics data to the database
    await Promise.all(posts.map(post => saveAnalytics(post)));

    res.status(200).json({ message: 'Analytics scraped and saved.', data: posts });
  } catch (error) {
    console.error('Error scraping analytics:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  router,
  postToLinkedIn,
  getScrapedAnalytics,
};