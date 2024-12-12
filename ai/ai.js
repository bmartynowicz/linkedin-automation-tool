const { OpenAI } = require('openai'); // Use require for CommonJS
const dotenv = require('dotenv');
const { getUserPreferences } = require('../services/usersService.js');

dotenv.config(); // Load environment variables

/**
 * AI Module for fetching suggestions using OpenAI's API.
 * 
 * This module interfaces with OpenAI's API to generate AI-powered suggestions
 * for LinkedIn posts, enhancing clarity, engagement, and professionalism.
 */

// Create a new OpenAI client instance
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your .env file
});

/**
 * Fetches AI suggestions based on the provided prompt and options.
 * 
 * @param {string} prompt - The text input from the user.
 * @param {Object} options - Additional options such as tone, max_tokens, etc.
 * @param {number} userId - The ID of the user to fetch preferences for.
 * @returns {Promise<string>} - The AI-generated suggestion or an empty string if an error occurs.
 */
async function getAISuggestions(prompt, options = {}, userId) {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    console.error('Invalid prompt provided to getAISuggestions.');
    return '';
  }

  if (!userId) {
    console.error('UserId is undefined.');
    return '';
  }

  try {
    // Fetch user preferences
    const userPreferences = await getUserPreferences(userId);
    if (!userPreferences) {
      throw new Error('User preferences not found.');
    }

    // Destructure options with defaults, including user preferences
    const {
      max_tokens = 150,
      temperature = 0.7,
      tone = userPreferences.tone || 'professional',
    } = options;

    // Enhance the prompt with more context for better AI suggestions
    const enhancedPrompt = `
    You are assisting a LinkedIn user in ${userPreferences.industry || 'an industry'} who focuses on ${userPreferences.content_focus || 'a content focus'}.
    They prefer posts with a ${tone} tone. Based on their recent activity, posts about ${userPreferences.topics || 'various topics'} perform best.
    Optimize the following post for maximum engagement:

    "${prompt}"

    Provide a professional and engaging revision with tailored hashtags and a concise CTA.
    `;

    // Make a request to OpenAI's Chat Completion API
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        { role: 'user', content: enhancedPrompt },
      ],
      max_tokens: max_tokens,
      temperature: temperature,
    });

    // Check if the response contains choices
    if (response && response.choices && Array.isArray(response.choices) && response.choices.length > 0) {
      const suggestion = response.choices[0].message.content.trim();
      if (suggestion.length === 0) {
        console.warn('Received an empty suggestion from OpenAI API.');
      }
      return suggestion;
    } else {
      console.warn('No suggestions returned from OpenAI API.');
      return '';
    }
  } catch (error) {
    if (error.response) {
      console.error('OpenAI API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error fetching AI suggestions:', error.message);
    }
    return '';
  }
}

// Export the function for use in other files
module.exports = { getAISuggestions };
