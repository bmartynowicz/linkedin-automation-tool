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
    console.log('Processing AI suggestion for userId:', userId, userPreferences);

    // Destructure preferences with fallback defaults
    const {
      tone = 'professional',
      writing_style = 'brief',
      engagement_focus = 'comments',
      vocabulary_level = 'simplified',
      content_type = 'linkedin-post',
      content_perspective = 'first-person',
      emphasis_tags = '',
      language = 'en',
    } = userPreferences;

    // Map content type to specific configurations
    const contentTypeConfig = {
      'linkedin-post': {
        description: 'a LinkedIn post optimized for engagement',
        max_tokens: 700,
        temperature: 0.7,
      },
      'job-application': {
        description: 'a formal job application message',
        max_tokens: 500,
        temperature: 0.6,
      },
      'connection-request': {
        description: 'a concise and professional connection request note',
        max_tokens: 100,
        temperature: 0.6,
      },
    };

    const writingStyleConfig = {
      brief: 0.75,        // Reduce max tokens for concise output
      detailed: 1.25,     // Slightly longer responses
      storytelling: 1.5,  // Rich, narrative-style responses
    };

    // Use configuration for the specific content type or fallback
    const config = contentTypeConfig[content_type] || {
      description: 'general content',
      max_tokens: 200,
      temperature: 0.7,
    };

    // Determine the base tokens and apply the multiplier based on writing style
    const baseMaxTokens = config.max_tokens || 200;
    const styleMultiplier = writingStyleConfig[writing_style] || 1;
    const dynamicMaxTokens = Math.round(baseMaxTokens * styleMultiplier);

    // Build the enhanced prompt using user preferences
    const enhancedPrompt = `
    You are assisting a LinkedIn user to craft ${config.description}.
    They prefer a ${tone} tone with a ${writing_style} style.
    Their engagement goal is ${engagement_focus}, using a ${vocabulary_level} vocabulary and ${content_perspective} perspective.
    Write the response in ${language}.
    Emphasize the following tags where relevant: ${emphasis_tags}.
    Optimize the following content for its purpose:

    "${prompt}"

    Provide a professional and engaging revision with a clear call-to-action.
    `;

    console.log('Enhanced Prompt:', enhancedPrompt); // Debugging log

    // Merge options with defaults
    const {
      max_tokens = dynamicMaxTokens,
      temperature = config.temperature,
    } = options;

    // Make a request to OpenAI's Chat Completion API
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant specializing in crafting LinkedIn content.' },
        { role: 'user', content: enhancedPrompt },
      ],
      max_tokens: max_tokens,
      temperature: temperature,
    });

    // Check if the response contains choices
    if (response && response.choices && Array.isArray(response.choices) && response.choices.length > 0) {
      const suggestion = response.choices[0].message.content.trim();
      if (!suggestion) {
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
      console.error('OpenAI API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error fetching AI suggestions:', error.message);
    }
    return '';
  }
}

module.exports = { getAISuggestions };