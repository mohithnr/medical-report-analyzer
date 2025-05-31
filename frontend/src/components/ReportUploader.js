import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Buffer } from 'buffer'; // Add this import
import { textToSpeech, cleanupAudioUrl } from '../components/Sarvam';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import Chatbot from './Chatbot';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const imagepath = "/hrp project image.webp";

const chunkText = (text, maxLen = 500) => {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLen;
    if (end < text.length) {
      let lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
};

const getAbnormalitiesChartData = (abnormalities) => {
  if (!abnormalities || abnormalities.length === 0) return null;

  // Extract test names, actual values, and normal ranges
  const labels = abnormalities.map(item => item.test);
  const actualValues = abnormalities.map(item => {
    // Extract numeric value from result (e.g., "100.50 u/L" -> 100.50)
    const match = item.result.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  });
  const minValues = abnormalities.map(item => {
    // Extract min from normalRange (e.g., "10.00 - 49.00 u/L" -> 10.00)
    const match = item.normalRange.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  });
  const maxValues = abnormalities.map(item => {
    // Extract max from normalRange (e.g., "10.00 - 49.00 u/L" -> 49.00)
    const match = item.normalRange.match(/- ([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  });

  return {
    labels,
    datasets: [
      {
        label: 'Actual Value',
        data: actualValues,
        backgroundColor: 'rgba(239, 68, 68, 0.7)', // red
      },
      {
        label: 'Min Normal',
        data: minValues,
        backgroundColor: 'rgba(34, 197, 94, 0.5)', // green
      },
      {
        label: 'Max Normal',
        data: maxValues,
        backgroundColor: 'rgba(59, 130, 246, 0.5)', // blue
      }
    ]
  };
};

const ReportUploader = () => {
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState("English");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [currentSection, setCurrentSection] = useState(null);
  const [audioQueue, setAudioQueue] = useState([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false); // Add isOpen state
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
    return () => {
      // Cleanup audio URLs when component unmounts
      if (audioUrl) {
        cleanupAudioUrl(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (currentAudioIndex < audioQueue.length - 1) {
        const nextIndex = currentAudioIndex + 1;
        setCurrentAudioIndex(nextIndex);
        audio.src = audioQueue[nextIndex];
        audio.play();
      } else {
        setIsPlaying(false);
        setAudioQueue([]);
        setCurrentAudioIndex(0);
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [audioQueue, currentAudioIndex]);

  useEffect(() => {
    if (audioQueue.length > 0 && audioRef.current && isPlaying) {
      audioRef.current.src = audioQueue[currentAudioIndex];
      audioRef.current.play();
    }
  }, [currentAudioIndex]);

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

  const isValidSummary = (summary) => {
    try {
      const data = summary.keyFindings ? summary : summary.summary;
      
      return data &&
        typeof data.keyFindings === 'string' &&
        Array.isArray(data.abnormalities) &&
        typeof data.recommendedSteps === 'string' &&
        typeof data.healthAdvice === 'string';
    } catch (error) {
      return false;
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file to upload');
      return;
    }
  
    setLoading(true); // Set loading true before API call
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
  
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
        timeout: 30000
      });
  
      if (!data || !data.summary.keyFindings) {
        throw new Error('Invalid response format');
      }
  
      if (data.summary.keyFindings) {
        const binaryStr = atob(data.pdfData);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(blob);
        setPdfUrl(pdfUrl);
      }
  
      setResponse({
        summary: data.summary.keyFindings
      });
  
    } catch (error) {
      console.error("Upload error:", error);
      setResponse(null);
      alert(`Error: ${error.response?.data?.error || error.message || 'Failed to process report'}`);
    } finally {
      setLoading(false); // Set loading false after completion
    }
  };

  const handleDelete = async () => {
    try {
      const apiUrl = await getApiUrl();
      const response = await axios({
        method: 'DELETE',
        url: `${apiUrl}/delete-files`,
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
      
      const fullText = [
        `Key Findings. ${parsedSummary.keyFindings}`,
        `Abnormalities. ${parsedSummary.abnormalities.map(item => 
          `${item.test}. Result: ${item.result}. Normal Range: ${item.normalRange}. Finding: ${item.abnormality}.`
        ).join(' ')}`,
        `Recommended Steps. ${parsedSummary.recommendedSteps}`,
        `Health Advice. ${parsedSummary.healthAdvice}`
      ].join('. ');

      const truncatedText = fullText.slice(0, 3000);

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

  const handlePlayAllSections = async () => {
    if (!parsedSummary) return;
    setIsPlaying(true);

    // Prepare sections in order
    const sections = [
      { label: "Key Findings", text: `Key Findings. ${parsedSummary.keyFindings}` },
      { label: "Abnormalities", text: `Abnormalities. ${parsedSummary.abnormalities.map(item =>
        `${item.test}. Result: ${item.result}. Normal Range: ${item.normalRange}. Finding: ${item.abnormality}.`
      ).join(' ')}` },
      { label: "Recommended Steps", text: `Recommended Steps. ${parsedSummary.recommendedSteps}` },
      { label: "Health Advice", text: `Health Advice. ${parsedSummary.healthAdvice}` }
    ].filter(section => section.text && section.text.trim().length > 0);

    const allAudioUrls = [];

    try {
      for (const section of sections) {
        // Split section text into 500-char chunks
        const chunks = chunkText(section.text, 500);
        for (const chunk of chunks) {
          // Await each Sarvam API call before proceeding
          const url = await textToSpeech(chunk, language.toLowerCase());
          allAudioUrls.push(url);

          // If this is the first audio, start playback immediately
          if (allAudioUrls.length === 1 && audioRef.current) {
            setAudioQueue([url]);
            setCurrentAudioIndex(0);
            audioRef.current.src = url;
            audioRef.current.play();
          } else {
            // For subsequent audios, append to queue
            setAudioQueue(prev => [...prev, url]);
          }
        }
        // Optional: small delay between blocks for natural flow
        await new Promise(res => setTimeout(res, 200));
      }
      // If only one audio, ensure queue is set
      if (allAudioUrls.length === 1) {
        setAudioQueue(allAudioUrls);
        setCurrentAudioIndex(0);
      }
    } catch (error) {
      setIsPlaying(false);
      alert("Failed to play all sections.");
    }
  };

  const parsedSummary = response?.summary || null;

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-200 p-4 md:p-8"
    >
      <motion.h1 
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold text-indigo-900 mb-8 text-center"
      >
        Medical Report Analyzer
      </motion.h1>

      <motion.div 
        variants={fadeIn}
        initial="initial"
        animate="animate"
        className="w-full max-w-6xl mx-auto bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8"
      >
        <div className="flex flex-col md:flex-row gap-8">
          {loading ? (
            <div className="w-full">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[60vh] flex flex-col items-center justify-center space-y-8 bg-white/50 backdrop-blur-sm rounded-xl p-8"
              >
                <LoadingSpinner />
                <motion.span 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-semibold text-indigo-600"
                >
                  Analyzing Report...
                </motion.span>
                <motion.div 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-base text-gray-600 text-center max-w-md font-medium"
                >
                  Please wait while we process your medical report using AI
                </motion.div>
              </motion.div>
            </div>
          ) : !response ? (
            // Upload Section
            <div className="w-full md:w-1/3 mx-auto">
              <AnimatePresence>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/90 rounded-xl shadow-lg p-6 space-y-6"
                >
                  <div className="space-y-4">
                    <label className="block text-lg font-semibold text-indigo-900">Upload Report</label>
                    <input 
                      type="file" 
                      onChange={(e) => setFile(e.target.files[0])} 
                      accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                      className="w-full p-3 border-2 border-indigo-200 rounded-lg focus:border-indigo-500 transition-colors duration-300" 
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-lg font-semibold text-indigo-900">Select Language</label>
                    <select 
                      onChange={(e) => setLanguage(e.target.value)} 
                      className="w-full p-3 border-2 border-indigo-200 rounded-lg focus:border-indigo-500 transition-colors duration-300"
                    >
                      <option value="English">English</option>
                      <option value="Kannada">Kannada</option>
                      <option value="Telugu">Telugu</option>
                      <option value="Tamil">Tamil</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpload} 
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition duration-300"
                  >
                    Analyze Report
                  </motion.button>
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            // Results Section
            <div className="w-full">
              <AnimatePresence>
                {!loading && response && parsedSummary && (
                  <motion.div 
                    className="space-y-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <motion.div className="p-4 bg-blue-100/80 backdrop-blur-sm rounded-lg shadow-lg">
                      <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xl font-bold text-blue-800">Key Findings</h2>
                      </div>
                      <p className="text-blue-900 whitespace-pre-wrap">{parsedSummary.keyFindings}</p>
                    </motion.div>

                    <motion.div className="p-4 bg-red-100/80 backdrop-blur-sm rounded-lg shadow-lg">
                      <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xl font-bold text-red-800">Abnormalities</h2>
                      </div>
                      {/* Chart */}
                      {parsedSummary.abnormalities.length > 0 && (
                        <div className="mb-6">
                          <Bar
                            data={getAbnormalitiesChartData(parsedSummary.abnormalities)}
                            options={{
                              responsive: true,
                              plugins: {
                                legend: { position: 'top' },
                                tooltip: { enabled: true }
                              },
                              scales: {
                                y: { beginAtZero: true }
                              }
                            }}
                            height={220}
                          />
                        </div>
                      )}
                      {/* List */}
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

                    <motion.div className="p-4 bg-green-100/80 backdrop-blur-sm rounded-lg shadow-lg">
                      <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xl font-bold text-green-800">Recommended Steps</h2>
                      </div>
                      <p className="text-green-900 whitespace-pre-wrap">{parsedSummary.recommendedSteps}</p>
                    </motion.div>

                    <motion.div className="p-4 bg-purple-100/80 backdrop-blur-sm rounded-lg shadow-lg"> 
                      <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xl font-bold text-purple-800">Health Advice</h2>
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
          )}
        </div>
        {response && parsedSummary && (
          <Chatbot parsedSummary={parsedSummary} isOpen={isOpen} setIsOpen={setIsOpen} />
        )}
      </motion.div>

      <audio 
        ref={audioRef} 
        onEnded={() => {
          setIsPlaying(false);
          setCurrentSection(null);
        }} 
        className="hidden" 
      />
      {!loading && response && parsedSummary && (
        <>
          {/* Add Chatbot Icon Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)} // You'll need to add isOpen state
            className="p-2 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 fixed bottom-24 right-8 z-50 w-12 h-12 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </motion.button>

          {/* Existing Speaker Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayAllSections}
            disabled={isPlaying}
            className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 fixed bottom-8 right-8 z-50 w-12 h-12 flex items-center justify-center"
          >
            {isPlaying ? <LoadingSpinner /> : <SpeakerIcon />}
          </motion.button>

          {/* Existing Stop Button */}
          {isPlaying && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setIsPlaying(false);
                setAudioQueue([]);
                setCurrentAudioIndex(0);
                setCurrentSection(null);
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                  audioRef.current.src = "";
                }
              }}
              className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 fixed bottom-8 right-24 z-50 w-12 h-12 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
              </svg>
            </motion.button>
          )}
        </>
      )}
    </motion.div>
  );
};

const LoadingSpinner = () => (
  <div className="relative">
    <motion.div 
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="relative w-16 h-16"
    >
      <motion.div 
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full shadow-lg" />
      </motion.div>
      <motion.div 
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full shadow-md" />
      </motion.div>
    </motion.div>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="absolute -bottom-2 inset-x-0 flex justify-center"
    >
      <div className="w-3 h-3 bg-indigo-500 rounded-full mx-1 animate-bounce delay-100" />
      <div className="w-3 h-3 bg-indigo-500 rounded-full mx-1 animate-bounce delay-200" />
      <div className="w-3 h-3 bg-indigo-500 rounded-full mx-1 animate-bounce delay-300" />
    </motion.div>
  </div>
);

const SpeakerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

export default ReportUploader;