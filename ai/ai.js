// ai/ai.js

const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // Use environment variables for security
});

const openai = new OpenAIApi(configuration);

async function getAISuggestions(prompt) {
  try {
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: prompt,
      max_tokens: 150,
    });
    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error fetching AI suggestions:', error);
    return '';
  }
}

module.exports = { getAISuggestions };
