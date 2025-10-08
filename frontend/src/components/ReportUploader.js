import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { textToSpeech, cleanupAudioUrl } from '../components/Sarvam';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import Chatbot from './Chatbot';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

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

  const labels = abnormalities.map(item => item.test);
  const actualValues = abnormalities.map(item => {
    const match = item.result.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  });
  const minValues = abnormalities.map(item => {
    const match = item.normalRange.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  });
  const maxValues = abnormalities.map(item => {
    const match = item.normalRange.match(/- ([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  });

  return {
    labels,
    datasets: [
      {
        label: 'Actual Value',
        data: actualValues,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
        borderRadius: 8,
      },
      {
        label: 'Min Normal',
        data: minValues,
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
        borderRadius: 8,
      },
      {
        label: 'Max Normal',
        data: maxValues,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 8,
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
  const [isOpen, setIsOpen] = useState(false);
  const [chartHeight, setChartHeight] = useState(220);
  const audioRef = useRef(null);

  // Window resize handler for responsive chart
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setChartHeight(180);
      } else if (window.innerWidth < 768) {
        setChartHeight(200);
      } else if (window.innerWidth < 1024) {
        setChartHeight(220);
      } else {
        setChartHeight(260);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      await axios.get(`${process.env.REACT_APP_BACKEND_URL}/health`);
      return true;
    } catch (error) {
      return false;
    }
  };

  const getApiUrl = () => {
    const API_URL = process.env.REACT_APP_BACKEND_URL;
    if (!API_URL) {
      console.warn('Backend URL not found in environment variables, using default');
    }
    return API_URL;
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
  
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
  
    try {
      const apiUrl = process.env.REACT_APP_BACKEND_URL;
      const { data } = await axios({
        method: 'POST',
        url: `${apiUrl}/upload`,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: false,
        timeout: 120000
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
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const apiUrl = process.env.REACT_APP_BACKEND_URL;
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
        const chunks = chunkText(section.text, 500);
        for (const chunk of chunks) {
          const url = await textToSpeech(chunk, language.toLowerCase());
          allAudioUrls.push(url);

          if (allAudioUrls.length === 1 && audioRef.current) {
            setAudioQueue([url]);
            setCurrentAudioIndex(0);
            audioRef.current.src = url;
            audioRef.current.play();
          } else {
            setAudioQueue(prev => [...prev, url]);
          }
        }
        await new Promise(res => setTimeout(res, 200));
      }
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

  const getChartOptions = () => {
    const isMobile = window.innerWidth < 640;
    const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: 'top',
          labels: {
            font: {
              size: isMobile ? 10 : isTablet ? 12 : 14,
              weight: 'bold'
            },
            padding: isMobile ? 8 : 12,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: { 
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: {
            size: isMobile ? 11 : 13,
            weight: 'bold'
          },
          bodyFont: {
            size: isMobile ? 10 : 12
          },
          padding: isMobile ? 8 : 12,
          cornerRadius: 8
        }
      },
      scales: {
        y: { 
          beginAtZero: true,
          ticks: {
            font: {
              size: isMobile ? 9 : isTablet ? 11 : 12,
              weight: '500'
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          ticks: {
            font: {
              size: isMobile ? 8 : isTablet ? 10 : 11,
              weight: '500'
            },
            maxRotation: isMobile ? 45 : 0,
            minRotation: isMobile ? 45 : 0
          },
          grid: {
            display: false
          }
        }
      }
    };
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-200 p-3 sm:p-4 md:p-6 lg:p-8"
    >
      <motion.h1 
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-indigo-900 mb-4 sm:mb-6 md:mb-8 text-center px-2"
      >
        Medical Report Analyzer
      </motion.h1>

      <motion.div 
        variants={fadeIn}
        initial="initial"
        animate="animate"
        className="w-full max-w-6xl mx-auto bg-white/80 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-5 md:p-6 lg:p-8"
      >
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8">
          {loading ? (
            <div className="w-full">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[50vh] sm:h-[55vh] md:h-[60vh] flex flex-col items-center justify-center space-y-4 sm:space-y-6 md:space-y-8 bg-white/50 backdrop-blur-sm rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8"
              >
                <LoadingSpinner />
                <motion.span 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg sm:text-xl md:text-2xl font-semibold text-indigo-600 text-center"
                >
                  Analyzing Report...
                </motion.span>
                <motion.div 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm sm:text-base text-gray-600 text-center max-w-md font-medium px-4"
                >
                  Please wait while we process your medical report using AI
                </motion.div>
              </motion.div>
            </div>
          ) : !response ? (
            <div className="w-full md:w-2/3 lg:w-1/2 mx-auto">
              <AnimatePresence>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-gradient-to-br from-white to-indigo-50 rounded-xl shadow-xl border-2 border-indigo-100 p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 md:space-y-6"
                >
                  <div className="space-y-3 sm:space-y-4">
                    <label className="block text-base sm:text-lg md:text-xl font-bold text-indigo-900">
                      📄 Upload Medical Report
                    </label>
                    <div className="relative">
                      <input 
                        type="file" 
                        onChange={(e) => setFile(e.target.files[0])} 
                        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                        className="w-full p-3 sm:p-3.5 md:p-4 border-2 border-indigo-300 rounded-lg sm:rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 bg-white hover:border-indigo-400 file:mr-3 sm:file:mr-4 file:py-2 file:px-3 sm:file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-indigo-500 file:to-blue-500 file:text-white hover:file:from-indigo-600 hover:file:to-blue-600 file:cursor-pointer text-sm sm:text-base" 
                      />
                    </div>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <label className="block text-base sm:text-lg md:text-xl font-bold text-indigo-900">
                      🌐 Select Language
                    </label>
                    <select 
                      onChange={(e) => setLanguage(e.target.value)} 
                      className="w-full p-3 sm:p-3.5 md:p-4 border-2 border-indigo-300 rounded-lg sm:rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 bg-white hover:border-indigo-400 font-medium text-sm sm:text-base cursor-pointer"
                    >
                      <option value="English">English</option>
                      <option value="Kannada">Kannada</option>
                      <option value="Telugu">Telugu</option>
                      <option value="Tamil">Tamil</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(79, 70, 229, 0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpload} 
                    className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 md:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg md:text-xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-indigo-700"
                  >
                    🔍 Analyze Report
                  </motion.button>
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="w-full">
              <AnimatePresence>
                {!loading && response && parsedSummary && (
                  <motion.div 
                    className="space-y-4 sm:space-y-5 md:space-y-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      className="p-3 sm:p-4 md:p-5 bg-gradient-to-br from-blue-100 to-blue-50 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex justify-between items-center mb-2 sm:mb-3">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-800 flex items-center gap-2">
                          <span className="text-xl sm:text-2xl">📊</span> Key Findings
                        </h2>
                      </div>
                      <p className="text-blue-900 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{parsedSummary.keyFindings}</p>
                    </motion.div>

                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      className="p-3 sm:p-4 md:p-5 bg-gradient-to-br from-red-100 to-red-50 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg border-2 border-red-200 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex justify-between items-center mb-2 sm:mb-3">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-red-800 flex items-center gap-2">
                          <span className="text-xl sm:text-2xl">⚠️</span> Abnormalities
                        </h2>
                      </div>
                      {parsedSummary.abnormalities.length > 0 && (
                        <div className="mb-4 sm:mb-5 md:mb-6 bg-white/60 p-2 sm:p-3 md:p-4 rounded-lg shadow-inner" style={{ height: `${chartHeight}px` }}>
                          <Bar
                            data={getAbnormalitiesChartData(parsedSummary.abnormalities)}
                            options={getChartOptions()}
                          />
                        </div>
                      )}
                      <div className="space-y-3 sm:space-y-4">
                        {parsedSummary.abnormalities.map((item, index) => (
                          <motion.div 
                            key={index} 
                            whileHover={{ scale: 1.02 }}
                            className="p-2.5 sm:p-3 md:p-4 bg-white/70 rounded-lg border border-red-200 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            <p className="font-bold text-red-900 mb-1.5 sm:mb-2 text-sm sm:text-base">{item.test}</p>
                            <p className="text-red-800 text-xs sm:text-sm mb-1"><span className="font-semibold">Result:</span> {item.result}</p>
                            <p className="text-red-800 text-xs sm:text-sm mb-1"><span className="font-semibold">Normal Range:</span> {item.normalRange}</p>
                            <p className="text-red-800 text-xs sm:text-sm"><span className="font-semibold">Finding:</span> {item.abnormality}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      className="p-3 sm:p-4 md:p-5 bg-gradient-to-br from-green-100 to-green-50 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg border-2 border-green-200 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex justify-between items-center mb-2 sm:mb-3">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-green-800 flex items-center gap-2">
                          <span className="text-xl sm:text-2xl">✅</span> Recommended Steps
                        </h2>
                      </div>
                      <p className="text-green-900 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{parsedSummary.recommendedSteps}</p>
                    </motion.div>

                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      className="p-3 sm:p-4 md:p-5 bg-gradient-to-br from-purple-100 to-purple-50 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg border-2 border-purple-200 hover:shadow-xl transition-all duration-300"
                    > 
                      <div className="flex justify-between items-center mb-2 sm:mb-3">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-purple-800 flex items-center gap-2">
                          <span className="text-xl sm:text-2xl">💡</span> Health Advice
                        </h2>
                      </div>
                      <p className="text-purple-900 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{parsedSummary.healthAdvice}</p>
                    </motion.div> 

                    {pdfUrl && (
                      <motion.a
                        whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)" }}
                        whileTap={{ scale: 0.98 }}
                        href={pdfUrl}
                        download="medical-report-analysis.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block w-full text-center bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-500 text-white px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 rounded-lg sm:rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 font-bold text-sm sm:text-base md:text-lg border-2 border-blue-600"
                      >
                        📥 Download PDF Report
                      </motion.a>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {response && (
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(239, 68, 68, 0.3)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDelete}
                  className="mt-4 sm:mt-5 md:mt-6 bg-gradient-to-r from-red-500 via-pink-600 to-red-500 text-white px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 w-full font-bold text-sm sm:text-base md:text-lg border-2 border-red-600"
                >
                  ➕ Add Another Report
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
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="p-2 sm:p-2.5 md:p-3 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-xl hover:shadow-2xl fixed bottom-20 sm:bottom-24 md:bottom-28 right-4 sm:right-6 md:right-8 z-50 w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 flex items-center justify-center border-2 border-white transition-all duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-5.5 sm:w-5.5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayAllSections}
            disabled={isPlaying}
            className="p-2 sm:p-2.5 md:p-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl fixed bottom-4 sm:bottom-6 md:bottom-8 right-4 sm:right-6 md:right-8 z-50 w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 flex items-center justify-center border-2 border-white transition-all duration-300"
          >
            {isPlaying ? (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <SpeakerIcon />
            )}
          </motion.button>

          {isPlaying && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
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
              className="p-2 sm:p-2.5 md:p-3 rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 shadow-xl hover:shadow-2xl fixed bottom-4 sm:bottom-6 md:bottom-8 right-20 sm:right-22 md:right-24 z-50 w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 flex items-center justify-center border-2 border-white transition-all duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-5.5 sm:w-5.5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  <div className="flex items-center justify-center">
    <motion.div 
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full"
    />
  </div>
);

const SpeakerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-5.5 sm:w-5.5 md:h-6 md:w-6" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

export default ReportUploader;