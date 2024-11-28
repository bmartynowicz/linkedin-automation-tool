const { OpenAI } = require('openai'); // Use require for CommonJS
const dotenv = require('dotenv');

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
 * @returns {Promise<string>} - The AI-generated suggestion or an empty string if an error occurs.
 */
async function getAISuggestions(prompt, options = {}) {
  // Validate the prompt
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    console.error('Invalid prompt provided to getAISuggestions.');
    return '';
  }

  // Destructure options with defaults
  const {
    max_tokens = 150,
    temperature = 0.7,
    tone = 'professional',
  } = options;

  // Enhance the prompt with more context for better AI suggestions
  const enhancedPrompt = `
  You are a professional LinkedIn content creator specializing in Information Technology, Leadership, and Business Building.
  Improve the following LinkedIn post for clarity, engagement, and professionalism with a ${tone} tone. Aim to increase audience size and drive more interactions:

  "${prompt}"

  Provide a concise and impactful revision.
  `;

  try {
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
    // Enhanced error handling
    if (error.response) {
      // API responded with an error
      console.error('OpenAI API Error:', error.response.status, error.response.data);
    } else {
      // Network or other errors
      console.error('Error fetching AI suggestions:', error.message);
    }
    return '';
  }
}

// Export the function for use in other files
module.exports = { getAISuggestions };
