// automation/linkedinScraper.js

const { chromium } = require('playwright');
const { getCurrentUser } = require('../services/usersService.js');
const { saveAnalytics } = require('../services/analyticsService.js');

const MAX_SCROLLS = 5;

async function scrapeLinkedInAnalytics(query) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  try {
    const user = await getCurrentUser();
    if (!user || !user.access_token) {
      throw new Error('User not authenticated.');
    }

    const page = await context.newPage();
    await page.goto('https://www.linkedin.com');
    
    // Inject cookies or session handling if needed
    // await context.addCookies([{ name, value, domain }]);

    // Simulate search
    await page.goto(`https://www.linkedin.com/feed/hashtag/?keywords=${query}`);
    await page.waitForTimeout(2000);

    let allPosts = [];

    for (let i = 0; i < MAX_SCROLLS; i++) {
      // Scrape visible posts
      const posts = await page.evaluate(() => {
        const postElements = document.querySelectorAll('.feed-shared-update-v2'); // Adjust selector
        return Array.from(postElements).map(post => ({
          author: post.querySelector('.update-components-actor__name')?.innerText || '',
          reactions: post.querySelector('.social-details-social-counts__reactions-count')?.innerText || '0',
          comments: post.querySelector('.social-details-social-counts__comments')?.innerText || '0',
          content: post.querySelector('.feed-shared-text')?.innerText || '',
        }));
      });

      allPosts.push(...posts);

      // Scroll to load more
      await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }

    await browser.close();

    return allPosts;
  } catch (error) {
    console.error('Error in LinkedIn scraping:', error);
    await browser.close();
    throw error;
  }
}

module.exports = {
  scrapeLinkedInAnalytics,
};
