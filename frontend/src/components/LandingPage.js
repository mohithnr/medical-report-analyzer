import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const imagepath = "/hrp project image.webp";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-400 via-blue-800 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/2 right-0 bg-sky-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute w-96 h-96 bottom-0 left-1/3 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Content Wrapper */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative min-h-screen flex flex-col md:flex-row items-center justify-center backdrop-blur-sm"
      >
        {/* Left: Image with animation */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full md:w-1/2 h-72 md:h-screen flex items-center justify-center bg-gradient-to-br from-sky-400/10 to-blue-600/10 backdrop-blur-md"
        >
          <motion.img
            src={imagepath}
            alt="Medical Report Analyzer"
            className="w-72 h-72 md:w-[80%] md:h-[80%] object-cover rounded-3xl shadow-2xl border-8 border-white/20 hover:border-sky-300/40 transition-all duration-300"
            initial={{ scale: 0.85, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
            whileHover={{ scale: 1.02, rotate: 2 }}
          />
        </motion.div>

        {/* Right: Content */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="w-full md:w-1/2 flex flex-col items-center justify-center px-8 py-12 md:py-0 bg-white/5 backdrop-blur-lg md:h-screen"
        >
          <motion.h1
            className="text-4xl md:text-6xl font-extrabold text-white mb-6 text-center drop-shadow-lg"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Medical Report
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-blue-400">
              Analyzer
            </span>
          </motion.h1>
          <motion.p
            className="max-w-xl text-lg md:text-xl text-sky-100 text-center mb-10 bg-sky-900/30 rounded-xl px-6 py-4 shadow-md backdrop-blur-md"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Upload your medical reports and get instant, AI-powered summaries, abnormality detection, recommendations, and health advice. Listen to your report in your preferred language and download a detailed PDF—all in one place.
          </motion.p>
          <motion.button
            whileHover={{ 
              scale: 1.07,
              boxShadow: "0 0 25px rgba(56, 189, 248, 0.5)"
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/analyze")}
            className="bg-gradient-to-r from-sky-400 to-blue-600 text-white px-10 py-4 rounded-2xl shadow-xl text-xl font-bold transition-all duration-300 hover:from-blue-600 hover:to-sky-400 hover:shadow-2xl hover:shadow-sky-500/30"
          >
            Enter Medical Report Analyzer
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LandingPage;