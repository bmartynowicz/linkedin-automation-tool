const { OpenAI } = require('openai'); // Use require for CommonJS
const dotenv = require('dotenv');
const { getUserPreferences } = require('../services/usersService'); // Import preferences service

dotenv.config(); // Load environment variables

// Create a new OpenAI client instance
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your .env file
});

/**
 * Fetches AI suggestions based on the provided prompt and user preferences.
 * 
 * @param {string} prompt - The text input from the user.
 * @param {number} userId - The ID of the user making the request.
 * @param {Object} options - Additional options such as max_tokens, temperature, etc.
 * @returns {Promise<string>} - The AI-generated suggestion or an empty string if an error occurs.
 */
async function getAISuggestions(prompt, userId, options = {}) {
  // Validate the prompt
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    console.error('Invalid prompt provided to getAISuggestions.');
    return '';
  }

  try {
    // Fetch user preferences
    const userPreferences = await getUserPreferences(userId);
    console.log('Processing AI suggestion for userId:', userId);

    // Destructure preferences with fallback defaults
    const {
      tone = 'professional',
      writing_style = 'brief',
      engagement_focus = 'comments',
      vocabulary_level = 'simplified',
      content_type = 'linkedin-post',
      content_perspective = 'first-person',
      emphasis_tags = '',
    } = userPreferences;

    // Build the enhanced prompt using user preferences
    const enhancedPrompt = `
    You are assisting a LinkedIn user who focuses on ${content_type}.
    They prefer a ${tone} tone with a ${writing_style} style.
    Their engagement goal is ${engagement_focus}, using a ${vocabulary_level} vocabulary and ${content_perspective} perspective.
    Emphasize the following tags where relevant: ${emphasis_tags}.
    Optimize the following post for maximum engagement:

    "${prompt}"

    Provide a professional and engaging revision with tailored hashtags and a concise CTA.
    `;

    console.log('Enhanced Prompt:', enhancedPrompt); // Debugging log

    // Destructure options with defaults
    const {
      max_tokens = 150,
      temperature = 0.7,
    } = options;

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
