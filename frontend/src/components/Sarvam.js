import { SarvamAIClient } from "sarvamai";

const API_KEY = process.env.REACT_APP_SARVAM_API_KEY;

// Validate API key on load
if (!API_KEY || API_KEY === "undefined") {
  console.error("⚠️ Sarvam API key is missing! Check your .env file.");
}

// Initialize SarvamAI client
const client = new SarvamAIClient({
  apiSubscriptionKey: API_KEY,
});

// Language code mapping
const getLanguageCode = (language) => {
  const languageMap = {
    english: "en-IN",
    hindi: "hi-IN",
    tamil: "ta-IN",
    telugu: "te-IN",
    kannada: "kn-IN",
    bengali: "bn-IN",
    gujarati: "gu-IN",
    marathi: "mr-IN",
    malayalam: "ml-IN",
    punjabi: "pa-IN",
  };
  return languageMap[language?.toLowerCase()] || "en-IN";
};

// Speaker mapping
const getSpeaker = (language) => {
  const speakers = {
    english: "anushka",
    hindi: "anushka",
    tamil: "anushka",
    telugu: "anushka",
    kannada: "anushka",
    bengali: "anushka",
    gujarati: "anushka",
    marathi: "anushka",
    malayalam: "anushka",
    punjabi: "anushka",
  };
  return speakers[language?.toLowerCase()] || "anushka";
};

/**
 * Convert text to speech using Sarvam AI SDK
 * @param {string} text - Text to convert (max 500 chars recommended per call)
 * @param {string} language - Target language (e.g., 'english', 'hindi')
 * @returns {Promise<string>} - Blob URL for audio playback
 */
export const textToSpeech = async (text, language = "english") => {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Invalid text input");
    }

    if (!API_KEY || API_KEY === "undefined") {
      throw new Error("API key is not configured. Please check your .env file.");
    }

    // Clean and prepare text
    const processedText = text
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s.,!?'-]/g, "")
      .slice(0, 500);

    if (!processedText) {
      throw new Error("Processed text is empty after cleaning");
    }

    const languageCode = getLanguageCode(language);
    const speaker = getSpeaker(language);

    console.log("🔊 TTS Request:", {
      language: languageCode,
      speaker,
      textPreview: processedText.substring(0, 50) + "...",
    });

    // Call Sarvam TTS API using SDK
    const response = await client.textToSpeech.convert({
      text: processedText,
      model: "bulbul:v2",
      speaker,
      target_language_code: languageCode,
    });

    if (!response) {
      throw new Error("Empty response from Sarvam API");
    }

    // ✅ Handle both `audio` (single) and `audios` (multiple) response formats
    let audioChunks = [];

    if (response.audios && Array.isArray(response.audios)) {
      audioChunks = response.audios;
    } else if (response.audio) {
      audioChunks = [response.audio];
    }

    if (audioChunks.length === 0) {
      console.error("Unexpected TTS response:", response);
      throw new Error("No audio data in response");
    }

    // Merge all base64 chunks into one Blob
    const buffers = audioChunks.map((base64) =>
      Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    );
    const audioBlob = new Blob(buffers, { type: "audio/wav" });
    const audioUrl = URL.createObjectURL(audioBlob);

    console.log("✅ Audio generated successfully");
    return audioUrl;
  } catch (error) {
    console.error("❌ Sarvam AI TTS Error:", error);

    if (error.response) {
      console.error("Error Response:", {
        status: error.response.status,
        data: error.response.data,
      });
    }

    if (error.response?.status === 401) {
      throw new Error("Authentication failed. Please verify your API key in .env file.");
    } else if (error.response?.status === 403) {
      throw new Error("Access forbidden. Your API key may not have TTS permissions.");
    } else if (error.response?.status === 429) {
      throw new Error("Rate limit exceeded. Please wait and retry.");
    } else if (error.response?.status >= 500) {
      throw new Error("Server error. Please try again later.");
    }

    throw new Error(error.message || "TTS conversion failed");
  }
};

/**
 * Clean up blob URL to prevent memory leaks
 * @param {string} url - Blob URL to revoke
 */
export const cleanupAudioUrl = (url) => {
  if (url && typeof url === "string" && url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
      console.log("🧹 Cleaned up audio URL");
    } catch (error) {
      console.error("Error cleaning up audio URL:", error);
    }
  }
};

/**
 * Helper to add delays between API calls to avoid rate limiting
 * @param {number} ms - Milliseconds to wait
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
