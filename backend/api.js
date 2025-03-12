const axios = require('axios');

const apiKey = 'AIzaSyCZfsorcLmb9R2S9eQUnBg_t8qj-zAykec'; // Replace with your actual API key

const testGeminiAPI = async () => {
  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        model: 'gemini-1.5-flash',
        prompt: 'Hello world'
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }
    );
    console.log(response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};

testGeminiAPI();
