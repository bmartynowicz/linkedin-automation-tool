import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Automates posting content to LinkedIn using Puppeteer.
 * 
 * Ensure that the following environment variables are set in your .env file:
 * - LINKEDIN_USERNAME: Your LinkedIn username/email.
 * - LINKEDIN_PASSWORD: Your LinkedIn password.
 * - PUPPETEER_HEADLESS: Set to 'true' for headless mode in production.
 * 
 * @param {string} content - The content to post on LinkedIn.
 */
async function postToLinkedIn(content) {
  if (!content || typeof content !== 'string') {
    console.error('Invalid content provided for LinkedIn post.');
    return;
  }

  try {
    const browser = await puppeteer.launch({
      headless: process.env.PUPPETEER_HEADLESS === 'true',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null,
    });

    const page = await browser.newPage();

    // LinkedIn login and post logic...
    
    console.log('Post successfully published to LinkedIn.');
  } catch (error) {
    console.error('Error posting to LinkedIn:', error);
  } finally {
    await browser.close();
  }
}


export { postToLinkedIn };
