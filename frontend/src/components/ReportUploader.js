import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Buffer } from 'buffer'; // Add this import
import { textToSpeech, cleanupAudioUrl } from '../components/Sarvam';

const imagepath = "/hrp project image.webp";

const ReportUploader = () => {
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState("English");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [currentSection, setCurrentSection] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const savedResponse = localStorage.getItem("response");
    if (savedResponse) {
      setResponse(JSON.parse(savedResponse));
    }
  }, []);

  useEffect(() => {
    if (response) {
      localStorage.setItem("response", JSON.stringify(response));
    }
  }, [response]);

  useEffect(() => {
    const updatePdfUrl = async () => {
      if (response && response.pdfPath) {
        const apiUrl = await getApiUrl();
        setPdfUrl(`${apiUrl}/${response.pdfPath}`);
      }
    };
    updatePdfUrl();
  }, [response]);

  useEffect(() => {
    return () => {
      // Cleanup audio URLs when component unmounts
      if (audioUrl) {
        cleanupAudioUrl(audioUrl);
      }
    };
  }, [audioUrl]);

  const checkLocalhost = async () => {
    try {
      await axios.get('http://localhost:5000/health');
      return true;
    } catch (error) {
      return false;
    }
  };

  const getApiUrl = async () => {
    const isLocalhostAvailable = await checkLocalhost();
    return isLocalhostAvailable 
      ? 'http://localhost:5000'
      : 'https://medical-report-analyzer-seven.vercel.app';
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file!");
      return;
    }
  
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a valid file (JPEG, PNG, WEBP, or PDF)");
      return;
    }
  
    setLoading(true);
    
    const formData = new FormData();
    formData.append("report", file);
    formData.append("language", language);
  
    try {
      const apiUrl = await getApiUrl();
      const { data } = await axios({
        method: 'POST',
        url: `${apiUrl}/upload`,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: false,
        timeout: 30000 // 30 second timeout
      });
  
      // Validate response
      if (!data) {
        throw new Error('Empty response from server');
      }
  
      // Check for error in response
      if (data.error) {
        throw new Error(data.error);
      }
  
      // Parse the summary
      const parsedData = parseSummary(data.summary);
      if (!parsedData) {
        throw new Error('Failed to parse medical report data');
      }
  
      // Set response with correct structure
      setResponse({
        summary: {
          keyFindings: parsedData.keyFindings,
          abnormalities: parsedData.abnormalities,
          recommendedSteps: parsedData.recommendedSteps,
          healthAdvice: parsedData.healthAdvice
        },
        pdfData: data.pdfData
      });
  
      // Update PDF handling to use proper base64 decoding
      if (data.pdfData) {
        try {
          const binaryStr = atob(data.pdfData);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const pdfUrl = URL.createObjectURL(blob);
          setPdfUrl(pdfUrl);
        } catch (pdfError) {
          console.error("PDF generation error:", pdfError);
          throw new Error('Failed to generate PDF');
        }
      }
  
    } catch (error) {
      console.error("Upload error:", error);
      setResponse(null);
      setPdfUrl('');
      
      let errorMessage = "Failed to process report: ";
      if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else if (error.response) {
        errorMessage += error.response.statusText;
      } else if (error.request) {
        errorMessage += "No response from server. Please try again.";
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const parseSummary = (summary) => {
    if (!summary) return null;
    
    try {
      // If summary is already an object with nested JSON string
      if (typeof summary === 'object' && summary.keyFindings) {
        // Try to parse the nested JSON string in keyFindings
        try {
          const cleanedJson = summary.keyFindings.replace(/```json\s*|\s*```/g, '').trim();
          const parsedInner = JSON.parse(cleanedJson);
          
          // Extract data in the correct structure
          return {
            keyFindings: parsedInner.keyFindings || '',
            abnormalities: parsedInner.abnormalities || [],
            recommendedSteps: parsedInner.recommendedSteps || '',
            healthAdvice: parsedInner.healthAdvice || ''
          };
        } catch (innerError) {
          console.error("Inner JSON parse error:", innerError);
          // If parsing fails, use the original object structure
          return summary;
        }
      }
  
      // If summary is a string
      if (typeof summary === 'string') {
        const cleanedSummary = summary.replace(/```json\s*|\s*```/g, '').trim();
        const parsed = JSON.parse(cleanedSummary);
        
        return {
          keyFindings: parsed.keyFindings || '',
          abnormalities: parsed.abnormalities || [],
          recommendedSteps: parsed.recommendedSteps || '',
          healthAdvice: parsed.healthAdvice || ''
        };
      }
  
      // If it's already a properly structured object
      return summary;
  
    } catch (error) {
      console.error("Error parsing summary:", error);
      return null;
    }
  };

  const handleDelete = async () => {
    try {
      const apiUrl = await getApiUrl();
      const response = await axios({
        method: 'DELETE',
        url: `${apiUrl}/delete-files`,
        // Remove withCredentials since we're using origin: '*'
        withCredentials: false
      });
      
      if (response.status === 200) {
        localStorage.removeItem("response");
        setResponse(null);
        setFile(null);
        setLanguage("English");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert(`Error: ${error.response?.data?.error || "Failed to delete files"}`);
    }
  };

  const handleTextToSpeech = async () => {
    try {
      setIsPlaying(true);
      
      // Format the text in a more concise way
      const fullText = [
        `Key Findings. ${parsedSummary.keyFindings}`,
        `Abnormalities. ${parsedSummary.abnormalities.map(item => 
          `${item.test}. Result: ${item.result}. Normal Range: ${item.normalRange}. Finding: ${item.abnormality}.`
        ).join(' ')}`,
        `Recommended Steps. ${parsedSummary.recommendedSteps}`,
        `Health Advice. ${parsedSummary.healthAdvice}`
      ].join('. ');

      // Limit text length to avoid API limitations
      const truncatedText = fullText.slice(0, 3000); // Most APIs have character limits

      const url = await textToSpeech(truncatedText.trim(), language.toLowerCase());
      setAudioUrl(url);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Text to speech error:', error);
      alert('Failed to convert text to speech. The text might be too long or contains invalid characters.');
    } finally {
      setIsPlaying(false);
    }
  };

  const handleSpeak = async (text) => {
    try {
      setIsPlaying(true);
      const url = await textToSpeech(text, language);
      setAudioUrl(url);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Speech error:', error);
      alert('Failed to convert text to speech');
    } finally {
      setIsPlaying(false);
    }
  };

  // Update handleSectionSpeak function
  const handleSectionSpeak = async (text, section) => {
    try {
      setIsPlaying(true);
      setCurrentSection(section);
      const url = await textToSpeech(text, language.toLowerCase());
      setAudioUrl(url);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error(`Speech error for ${section}:`, error);
      alert('Failed to convert text to speech');
    } finally {
      setIsPlaying(false);
      setCurrentSection(null);
    }
  };

  const parsedSummary = response?.summary ? parseSummary(response.summary) : null;

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center bg-gradient-to-br from-blue-200 to-indigo-500 p-6"
    >
      <motion.h1 
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-3xl md:text-4xl font-bold text-black mb-6 text-center backdrop-blur-sm p-4 rounded-lg"
      >
        Medical Report Analyzer
      </motion.h1>

      <motion.div 
        variants={fadeIn}
        initial="initial"
        animate="animate"
        className="w-full max-w-5xl bg-white/90 backdrop-blur-md rounded-xl shadow-2xl p-6 flex flex-col md:flex-row gap-6"
      >
        <div className="flex flex-col items-center w-full md:w-1/2">
          <motion.img 
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
            src={imagepath} 
            alt="Medical Analysis" 
            className="w-full h-56 object-cover rounded-lg shadow-md" 
          />
          
          <AnimatePresence>
            {!response && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full flex flex-col space-y-4 mt-4"
              >
                <label className="font-semibold text-gray-700">Upload Report:</label>
                <input 
                  type="file" 
                  onChange={(e) => setFile(e.target.files[0])} 
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  className="p-2 border-2 border-gray-300 rounded-lg w-full focus:border-blue-500 transition-colors duration-300" 
                />
                <label className="font-semibold text-gray-700">Select Language:</label>
                <select 
                  onChange={(e) => setLanguage(e.target.value)} 
                  className="p-2 border-2 border-gray-300 rounded-lg w-full focus:border-blue-500 transition-colors duration-300"
                >
                  <option value="English">English</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Hindi">Hindi</option>
                </select>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpload} 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition duration-300 w-full"
                >
                  Upload
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-start w-full md:w-1/2">
          <AnimatePresence>
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center space-y-4 w-full"
              >
                <div className="w-16 h-16 border-4 border-dashed border-blue-500 rounded-full animate-spin"></div>
                <span className="text-lg font-semibold text-blue-600">Processing...</span>
              </motion.div>
            )}

            {!loading && response && parsedSummary && (
              <motion.div className="space-y-6 w-full">
                {/* Key Findings Section */}
                <motion.div className="p-4 bg-blue-100/80 backdrop-blur-sm rounded-lg shadow-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold text-blue-800">Key Findings</h2>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSectionSpeak(parsedSummary.keyFindings, 'keyFindings')}
                      disabled={isPlaying}
                      className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                    >
                      {isPlaying && currentSection === 'keyFindings' ? <LoadingSpinner /> : <SpeakerIcon />}
                    </motion.button>
                  </div>
                  <p className="text-blue-900 whitespace-pre-wrap">{parsedSummary.keyFindings}</p>
                </motion.div>

                {/* Abnormalities Section */}
                <motion.div className="p-4 bg-red-100/80 backdrop-blur-sm rounded-lg shadow-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold text-red-800">Abnormalities</h2>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSectionSpeak(
                        parsedSummary.abnormalities.map(item => 
                          `${item.test}. Result: ${item.result}. Normal Range: ${item.normalRange}. Finding: ${item.abnormality}.`
                        ).join('. '),
                        'abnormalities'
                      )}
                      disabled={isPlaying}
                      className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      {isPlaying && currentSection === 'abnormalities' ? <LoadingSpinner /> : <SpeakerIcon />}
                    </motion.button>
                  </div>
                  <div className="space-y-4">
                    {parsedSummary.abnormalities.map((item, index) => (
                      <div key={index} className="p-3 bg-white/50 rounded-lg">
                        <p className="font-bold text-red-900 mb-2">{item.test}</p>
                        <p className="text-red-800"><span className="font-semibold">Result:</span> {item.result}</p>
                        <p className="text-red-800"><span className="font-semibold">Normal Range:</span> {item.normalRange}</p>
                        <p className="text-red-800"><span className="font-semibold">Finding:</span> {item.abnormality}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Recommended Steps Section */}
                <motion.div className="p-4 bg-green-100/80 backdrop-blur-sm rounded-lg shadow-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold text-green-800">Recommended Steps</h2>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSectionSpeak(parsedSummary.recommendedSteps, 'recommendedSteps')}
                      disabled={isPlaying}
                      className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                    >
                      {isPlaying && currentSection === 'recommendedSteps' ? <LoadingSpinner /> : <SpeakerIcon />}
                    </motion.button>
                  </div>
                  <p className="text-green-900 whitespace-pre-wrap">{parsedSummary.recommendedSteps}</p>
                </motion.div>

                {/* Health Advice Section */}
                <motion.div className="p-4 bg-purple-100/80 backdrop-blur-sm rounded-lg shadow-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold text-purple-800">Health Advice</h2>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSectionSpeak(parsedSummary.healthAdvice, 'healthAdvice')}
                      disabled={isPlaying}
                      className="p-2 rounded-full bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
                    >
                      {isPlaying && currentSection === 'healthAdvice' ? <LoadingSpinner /> : <SpeakerIcon />}
                    </motion.button>
                  </div>
                  <p className="text-purple-900 whitespace-pre-wrap">{parsedSummary.healthAdvice}</p>
                </motion.div>

                {pdfUrl && (
                  <motion.a
                    whileHover={{ scale: 1.05 }}
                    href={pdfUrl}
                    download="medical-report-analysis.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block w-full text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition duration-300"
                  >
                    Download PDF Report
                  </motion.a>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {response && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDelete}
              className="mt-6 bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition duration-300 w-full"
            >
              Add Another Report
            </motion.button>
          )}
        </div>
      </motion.div>
      <audio 
        ref={audioRef} 
        onEnded={() => {
          setIsPlaying(false);
          setCurrentSection(null);
        }} 
        className="hidden" 
      />
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleTextToSpeech}
        disabled={isPlaying}
        className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 fixed bottom-8 right-8 z-50 w-12 h-12 flex items-center justify-center"
      >
        {isPlaying ? (
          <span className="flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </motion.button>
    </motion.div>
  );
};

// Add these components at the top of the file
const LoadingSpinner = () => (
  <span className="flex items-center space-x-2">
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  </span>
);

const SpeakerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

export default ReportUploader;
