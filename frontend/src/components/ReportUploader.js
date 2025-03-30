import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const imagepath = "/hrp project image.webp";

const ReportUploader = () => {
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState("English");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

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

  const checkLocalhost = async () => {
    try {
      await axios.get('http://localhost:5000/health');
      return true;
    } catch (error) {
      return false;
    }
  };

  const getApiUrl = async () => {
    if (process.env.NODE_ENV === 'development') {
      try {
        await axios.get('http://localhost:5000/health');
        return 'http://localhost:5000';
      } catch (error) {
        console.log('Localhost not available, using production API');
        return 'https://medical-report-analyzer-seven.vercel.app/api';
      }
    }
    return 'https://medical-report-analyzer-seven.vercel.app/api';
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file!");
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
        withCredentials: false
      });

      setResponse(data);
      
      // Handle PDF download from base64
      if (data.pdfData) {
        const blob = new Blob(
          [Buffer.from(data.pdfData, 'base64')], 
          { type: 'application/pdf' }
        );
        const pdfUrl = URL.createObjectURL(blob);
        setPdfUrl(pdfUrl);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Error: ${error.response?.data?.error || "Failed to process report"}`);
    } finally {
      setLoading(false);
    }
  };

  const parseSummary = (summary) => {
    const cleanedSummary = summary.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleanedSummary);
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

  const parsedSummary = response ? parseSummary(response.summary) : null;

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
              <motion.div 
                variants={fadeIn}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6 w-full"
              >
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="p-4 bg-blue-100/80 backdrop-blur-sm rounded-lg shadow-lg"
                >
                  <h2 className="text-lg font-semibold mb-2 text-blue-800">Key Findings</h2>
                  <p className="text-blue-900">{parsedSummary.keyFindings}</p>
                </motion.div>

                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="p-4 bg-red-100/80 backdrop-blur-sm rounded-lg shadow-lg"
                >
                  <h2 className="text-lg font-semibold mb-2 text-red-800">Abnormalities</h2>
                  {parsedSummary.abnormalities.map((item, index) => (
                    <div key={index} className="mb-4">
                      <p><strong>Test:</strong> {item.test}</p>
                      <p><strong>Result:</strong> {item.result}</p>
                      <p><strong>Normal Range:</strong> {item.normalRange}</p>
                      <p><strong>Abnormality:</strong> {item.abnormality}</p>
                    </div>
                  ))}
                </motion.div>

                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="p-4 bg-green-100/80 backdrop-blur-sm rounded-lg shadow-lg"
                >
                  <h2 className="text-lg font-semibold mb-2 text-green-800">Recommended Steps</h2>
                  <p className="text-green-900">{parsedSummary.recommendedSteps}</p>
                </motion.div>

                <motion.a
                  whileHover={{ scale: 1.05 }}
                  href={pdfUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition duration-300"
                >
                  Download PDF Report
                </motion.a>
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
    </motion.div>
  );
};

export default ReportUploader;
