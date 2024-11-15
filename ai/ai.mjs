// ai/ai.js

import { OpenAI } from 'openai'; // Update import to the newer version syntax (ES Modules)
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

/**
 * AI Module for fetching suggestions using OpenAI's API.
 * 
 * This module interfaces with OpenAI's API to generate AI-powered suggestions
 * for LinkedIn posts, enhancing clarity, engagement, and professionalism.
 */

/**
 * Create a new OpenAI client instance.
 * - `OPENAI_API_KEY`: Your OpenAI API key (required).
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your .env file
});

/**
 * Fetches AI suggestions based on the provided prompt.
 * 
 * @param {string} prompt - The text input from the user.
 * @returns {Promise<string>} - The AI-generated suggestion or an empty string if an error occurs.
 */
export async function getAISuggestions(prompt) {
  // Validate the prompt
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    console.error('Invalid prompt provided to getAISuggestions.');
    return '';
  }

  try {
    // Make a request to OpenAI's Chat Completion API
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        { role: 'user', content: `Improve the following LinkedIn post for clarity, engagement, and professionalism:\n\n"${prompt}"` },
      ],
      max_tokens: 150,
      temperature: 0.7,
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
