import axios from 'axios';
import axiosRetry from 'axios-retry';

const API_KEY = process.env.REACT_APP_SARVAM_API_KEY;

// Create API client with retry logic
const sarvamClient = axios.create({
  baseURL: 'https://api.sarvam.ai',
  headers: {
    'Content-Type': 'application/json',
    'api-subscription-key': API_KEY
  },
  timeout: 30000 // 30 second timeout
});

axiosRetry(sarvamClient, { 
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           error.response?.status === 429;
  }
});

// Language code mapping
const getLanguageCode = (language) => {
  const languageMap = {
    'english': 'en-IN',
    'hindi': 'hi-IN',
    'tamil': 'ta-IN',
    'telugu': 'te-IN',
    'kannada': 'kn-IN',
    'bengali': 'bn-IN'
  };
  return languageMap[language.toLowerCase()] || 'en-IN';
};

export const textToSpeech = async (text, language = 'english') => {
  try {
    // Clean and prepare the text
    const processedText = text
      .replace(/[^\w\s.,]/g, ' ') // Replace special characters with spaces
      .replace(/\s+/g, ' ')       // Normalize spaces
      .trim()
      .slice(0, 1000);            // Limit text length to 1000 characters

    const requestData = {
      speaker: "amol",
      pitch: 0,
      pace: 1,
      loudness: 1,
      speech_sample_rate: 22050,
      enable_preprocessing: false,
      inputs: [processedText],
      target_language_code: getLanguageCode(language),
      model: "bulbul:v1"
    };

    const response = await sarvamClient.post('/text-to-speech', requestData);

    if (response.data && response.data.audios && response.data.audios.length > 0) {
      const audioData = response.data.audios[0];
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioData), c => c.charCodeAt(0))],
        { type: 'audio/wav' }
      );
      return URL.createObjectURL(audioBlob);
    }

    throw new Error('No audio data received');
  } catch (error) {
    console.error('Sarvam AI TTS Error:', error);
    
    if (error.response?.status === 400) {
      throw new Error(`Invalid request: ${error.response?.data?.message || 'Text format not supported'}`);
    } else if (error.response?.status === 403) {
      throw new Error('Authentication failed. Please check your API key.');
    } else if (error.response?.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }
    
    throw new Error('Failed to convert text to speech. Please try again.');
  }
};

export const cleanupAudioUrl = (url) => {
  if (url) {
    URL.revokeObjectURL(url);
  }
};