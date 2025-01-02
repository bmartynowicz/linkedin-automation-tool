// automation/linkedin.js

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const { findOrCreateUser, getCurrentUser, refreshAccessToken } = require('../services/usersService.js');
const { scrapeLinkedInAnalytics } = require('../automation/linkedinScraper.js');
const { chromium } = require('playwright');
const { BrowserWindow } = require('electron');
const db = require('../database/database.js');

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

async function createBrowserContextWithCookies(userId) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  console.log('Fetching cookies from database...');
  const cookies = await getCookiesFromDatabase(userId);

  if (cookies.length === 0) {
    console.warn('No cookies found for user.');
    await browser.close();
    throw new Error('No cookies available. User may need to log in.');
  }

  console.log('Setting cookies for the browser context...');
  await context.addCookies(cookies);

  // Create a new page in the context
  const page = await context.newPage();
  return { browser, context, page };
}

async function validateLoginState(page) {
  try {
    await page.waitForSelector('.global-nav__me', { timeout: 5000 });
    console.log('User is logged in.');
    return true;
  } catch (error) {
    console.warn('User is not logged in or session has expired.');
    return false;
  }
}

async function scrapePostAnalytics(userId, linkedinPostId, existingPage = null) {
  const postAnalyticsUrl = `https://www.linkedin.com/analytics/post-summary/${linkedinPostId.replace(
    'urn:li:share',
    'urn:li:activity'
  )}/`;

  try {
    console.log(`Scraping analytics for LinkedIn post ID: ${linkedinPostId}`);

    // Use existing page or create a new browser context
    let browser, context, page;
    if (existingPage) {
      page = existingPage;
    } else {
      const result = await createBrowserContextWithCookies(userId);
      browser = result.browser;
      context = result.context;
      page = result.page;
    }

    console.log('Navigating to LinkedIn analytics page...');
    await page.goto(postAnalyticsUrl, { waitUntil: 'domcontentloaded' });

    // Wait for the necessary section to load
    await page.waitForSelector('.member-analytics-addon-card__subcomponent-container', { timeout: 10000 });

    // Scrape "Discovery" metrics (Impressions and Members reached)
    const impressions = await page.$eval(
      'li.member-analytics-addon-summary__list-item:nth-of-type(1) .text-body-medium-bold',
      (el) => el.textContent.trim()
    );
    const reach = await page.$eval(
      'li.member-analytics-addon-summary__list-item:nth-of-type(2) .text-body-medium-bold',
      (el) => el.textContent.trim()
    );

    // Scrape "Engagement" metrics (Reactions, Comments, and Reposts)
    const reactions = await page.$eval(
      'li.member-analytics-addon__cta-list-item:nth-of-type(1) .member-analytics-addon__cta-list-item-text',
      (el) => el.textContent.trim()
    );
    const comments = await page.$eval(
      'li.member-analytics-addon__cta-list-item:nth-of-type(2) .member-analytics-addon__cta-list-item-text',
      (el) => el.textContent.trim()
    );
    const reposts = await page.$eval(
      'li.member-analytics-addon__cta-list-item:nth-of-type(3) .member-analytics-addon__cta-list-item-text',
      (el) => el.textContent.trim()
    );

    console.log({ impressions, reach, reactions, comments, reposts });

    // Save scraped data to the database
    await saveAnalyticsToDatabase(linkedinPostId, {
      impressions,
      reach,
      reactions,
      comments,
      reposts,
    });

    if (!existingPage) await browser.close(); // Close browser only if it was newly created

    return { success: true, data: { impressions, reach, reactions, comments, reposts } };
  } catch (error) {
    console.error('Error scraping analytics:', error.message);
    if (browser) await browser.close(); // Ensure browser cleanup
    return { success: false, error: error.message };
  }
}

// Save analytics data to the database
async function saveAnalyticsToDatabase(postId, data) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO analytics (
        post_id, impressions, reach, reactions, comments, engagement_metrics, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(post_id) DO UPDATE SET
        impressions = excluded.impressions,
        reach = excluded.reach,
        reactions = excluded.reactions,
        comments = excluded.comments,
        engagement_metrics = excluded.engagement_metrics,
        created_at = CURRENT_TIMESTAMP
    `;

    const metrics = JSON.stringify({
      impressions: data.impressions,
      reach: data.reach,
      reactions: data.reactions,
      comments: data.comments,
    });

    db.run(
      query,
      [
        postId,
        parseInt(data.impressions) || 0,
        parseInt(data.reach) || 0,
        parseInt(data.reactions) || 0,
        parseInt(data.comments) || 0,
        metrics,
      ],
      (err) => {
        if (err) {
          console.error('Error saving analytics to database:', err.message);
          reject(err);
        } else {
          console.log('Analytics data saved successfully.');
          resolve();
        }
      }
    );
  });
}

/**
 * Function: openLinkedInBrowser
 * Opens a Playwright-controlled browser and navigates to LinkedIn.
 * @returns {Promise<Object>} Success message or error.
 */
async function openLinkedInBrowser() {
  try {
    console.log('Launching Playwright browser...');
    const browser = await chromium.launch({ headless: false }); // Set headless to false for debugging
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to LinkedIn...');
    await page.goto('https://www.linkedin.com/login');

    return { success: true, message: 'Browser launched and LinkedIn loaded.' };
  } catch (error) {
    console.error('Error opening LinkedIn browser:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Open browser, log in to LinkedIn, and save cookies.
 * @param {number} userId - The ID of the user in the database.
 */
async function openLinkedInBrowserAndSaveCookies(userId) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to LinkedIn login...');
  await page.goto('https://www.linkedin.com/login');

  // Wait for user login
  console.log('Waiting for login...');
  await page.waitForTimeout(30000); // Extend or replace with appropriate condition.

  console.log('Saving cookies...');
  const cookies = await context.cookies();
  await saveCookiesToDatabase(userId, cookies);

  console.log('Cookies saved. Closing browser...');
  await browser.close();

  return { success: true, message: 'Cookies saved and browser closed.' };
}

/**
 * Load LinkedIn in a browser with saved cookies.
 * @param {number} userId - The ID of the user in the database.
 */
async function loadCookiesAndOpenBrowser(userId) {
  try {
    const { browser, context, page } = await createBrowserContextWithCookies(userId);

    console.log('Navigating to LinkedIn...');
    await page.goto('https://www.linkedin.com/feed');

    console.log('Browser loaded with cookies successfully.');
    // Do not return the browser object
    return { success: true, message: 'Browser loaded with cookies.' };
  } catch (error) {
    console.error('Error loading browser with cookies:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Save cookies to the database.
 */
async function saveCookiesToDatabase(userId, cookies) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO cookies (user_id, domain, name, value, path, expiry)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    cookies.forEach((cookie) => {
      stmt.run(
        userId,
        cookie.domain,
        cookie.name,
        cookie.value,
        cookie.path,
        cookie.expires || null,
        (err) => {
          if (err) {
            console.error('Error saving cookie:', err.message);
            return reject(err);
          }
        }
      );
    });

    stmt.finalize(() => {
      console.log('Cookies saved successfully.');
      resolve();
    });
  });
}

/**
 * Retrieve cookies from the database.
 */
function getCookiesFromDatabase(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT domain, name, value, path, expiry FROM cookies WHERE user_id = ?',
      [userId],
      (err, rows) => {
        if (err) {
          console.error('Error fetching cookies:', err.message);
          return reject(err);
        }
        if (!rows.length) {
          console.warn(`No cookies found for user_id: ${userId}`);
        }
        resolve(rows.map((row) => ({ ...row, expires: row.expiry })));
      }
    );
  });
}

// Helper: Create LinkedIn Authentication Window
function createAuthWindow() {
  return new BrowserWindow({
    width: 600,
    height: 700,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
}

// Helper: Generate LinkedIn Auth URL
function generateAuthUrl(state) {
  const scope = process.env.LINKEDIN_SCOPES; // 'openid profile email w_member_social'
  const encodedScope = encodeURIComponent(scope); // 'openid%20profile%20email%20w_member_social'

  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    process.env.LINKEDIN_REDIRECT_URI
  )}&scope=${encodedScope}&state=${state}`;
}

// Helper: Handle Redirect and Authentication
async function handleAuthRedirect(event, url, authWindow) {
  console.log('Auth window redirecting to URL:', url);

  if (!url.startsWith(process.env.LINKEDIN_REDIRECT_URI)) return;

  event.preventDefault(); // Prevent the actual navigation

  const urlObj = new URL(url);
  const authorizationCode = urlObj.searchParams.get('code');
  const receivedState = urlObj.searchParams.get('state');

  if (receivedState !== global.oauthState) {
    console.error('State parameter mismatch. Possible CSRF attack.');
    authWindow.close();
    notifyRenderer('linkedin-auth-failure', { message: 'State parameter mismatch' });
    return;
  }

  if (!authorizationCode) {
    console.warn('Authorization code not found in URL.');
    authWindow.close();
    return;
  }

  console.log('Authorization code received:', authorizationCode);
  try {
    const tokenData = await exchangeAuthorizationCodeForTokens(authorizationCode);
    const user = await handleUserAuthentication(tokenData);
    global.currentUser = user;

    console.log('Current user set globally:', global.currentUser);
    notifyRenderer('linkedin-auth-success', user);

    authWindow.close();
  } catch (error) {
    console.error('Error during LinkedIn OAuth flow:', error.message);
    notifyRenderer('linkedin-auth-failure', { message: error.message });
    authWindow.close();
  }
}

// Helper: Exchange Authorization Code for Access and Refresh Tokens
async function exchangeAuthorizationCodeForTokens(authorizationCode) {
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
  console.log('Token data received:', {
    access_token: tokenData.access_token ? '*****' : undefined,
    expires_in: tokenData.expires_in,
    scope: tokenData.scope,
    token_type: tokenData.token_type,
    id_token: tokenData.id_token ? '*****' : undefined,
  });

  if (tokenData.error) throw new Error(tokenData.error_description || 'Failed to obtain access token');

  return tokenData;
}

// Helper: Handle User Authentication and Save to Database
async function handleUserAuthentication(tokenData) {
  const decodedIdToken = jwtDecode(tokenData.id_token);
  const userID = decodedIdToken.sub;
  const name = decodedIdToken.name;
  const email = decodedIdToken.email;

  if (!userID || !name) throw new Error('User information is incomplete.');

  console.log(`User ID: ${userID}, Name: ${name}, Email: ${email}`);

  return await findOrCreateUser(
    userID,
    name,
    email,
    tokenData.access_token,
    tokenData.refresh_token,
    tokenData.expires_in
  );
}

// Helper: Notify Renderer Process
function notifyRenderer(channel, data = {}) {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length > 0) {
    const mainWindow = allWindows[0];
    mainWindow.webContents.send(channel, data);
    console.log(`Sent "${channel}" IPC message to renderer`, data);
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
  scrapePostAnalytics,
  getCookiesFromDatabase,
  openLinkedInBrowser,
  openLinkedInBrowserAndSaveCookies,
  loadCookiesAndOpenBrowser,
};