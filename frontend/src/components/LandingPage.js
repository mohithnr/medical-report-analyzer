import React from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";

const imagepath = "/hrp project image.webp";
const logoPath = "/logo.svg";
const LandingPage = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-400 via-blue-800 to-slate-900">
      {/* Logo Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute top-0 left-0 w-full p-4 md:p-6 z-10"
      >
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img src={logoPath} alt="MedAI Logo" className="h-10 w-10" />
            <span className="text-white font-bold text-xl">MedAI Analyzer</span>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => window.location.href='#about'}
              className="text-white hover:text-sky-300 transition-colors"
            >
              About
            </button>
            <button 
              onClick={() => window.location.href='#contact'}
              className="text-white hover:text-sky-300 transition-colors"
            >
              Contact
            </button>
          </div>
        </div>
      </motion.div>

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

      {/* Footer */}
      <motion.footer 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="absolute bottom-0 left-0 w-full bg-black/20 backdrop-blur-md"
      >
        <div className="container mx-auto py-4 px-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6">
              <span className="text-white/80 text-sm">
                © {currentYear} MedAI Analyzer. All rights reserved.
              </span>
              <Link to="/privacy" className="text-white/80 hover:text-white text-sm">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-white/80 hover:text-white text-sm">
                Terms of Service
              </Link>
            </div>
            <div className="flex space-x-4">
              <motion.a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                className="text-white/80 hover:text-white"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </motion.a>
              <motion.a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                className="text-white/80 hover:text-white"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </motion.a>
            </div>
          </div>
        </div>
      </motion.footer>

      {/* Trust Badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-28 left-1/2 transform -translate-x-1/2 flex items-center space-x-8"
      >
        <div className="flex items-center space-x-2">
          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-white/80 text-sm">HIPAA Compliant</span>
        </div>
        <div className="flex items-center space-x-2">
          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-white/80 text-sm">256-bit Encryption</span>
        </div>
      </motion.div>
    </div>
  );
};

export default LandingPage;