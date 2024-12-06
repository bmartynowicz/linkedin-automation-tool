const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const usersService = require('../services/usersService'); // Adjust the path if necessary

dotenv.config();

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
    const user = await usersService.findOrCreateUser(userID, name, accessToken);
    console.log('User Data Saved:', user);

    res.status(200).json({ message: 'Authentication successful.', user });
  } catch (error) {
    console.error('Error during LinkedIn OAuth callback processing:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;