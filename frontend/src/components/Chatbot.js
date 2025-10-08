import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Gemini API key not found in environment variables');
  throw new Error('Gemini API key is required');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = await genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


const Chatbot = ({ parsedSummary, isOpen, setIsOpen }) => {
  const [messages, setMessages] = useState([
    {
      text: "Hi! I'm your Medical Report Assistant powered by Gemini AI. How can I help you understand your report?",
      isBot: true
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [chatHistory, setChatHistory] = useState([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setInput('');
    setIsTyping(true);

    try {
      const formattedHistory = chatHistory.map(entry => ({
        role: entry.role,
        parts: [{ text: entry.parts }]
      }));

      const chat = model.startChat({
        history: formattedHistory,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        },
      });

      const context = `
        Medical Report Summary:
        Key Findings: ${parsedSummary.keyFindings}
        Abnormalities: ${parsedSummary.abnormalities.map(item =>
          `${item.test} - Result: ${item.result}, Normal Range: ${item.normalRange}, Finding: ${item.abnormality}`
        ).join('; ')}
        Recommended Steps: ${parsedSummary.recommendedSteps}
        Health Advice: ${parsedSummary.healthAdvice}
      `;

      const prompt = `
        As a medical report assistant, help me understand this report context:
        ${context}
        
        User Question: ${userMessage}
        
        Provide a clear, concise, and accurate response based on the report information.
        If the information isn't in the report, say so.
        If medical terms are used, explain them in simple terms.
      `;

      const result = await chat.sendMessage([{ text: prompt }]);
      const response = result.response.text();
      console.log(response);
      const updatedHistory = [...chatHistory, {
        role: "user",
        parts: userMessage
      }, {
        role: "model",
        parts: response
      }];
      setChatHistory(updatedHistory);

      setTimeout(() => {
        setMessages(prev => [...prev, { text: response, isBot: true }]);
        setIsTyping(false);
      }, 500);

    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, {
        text: "I apologize, but I'm having trouble processing your question. Please try again.",
        isBot: true
      }]);
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-3 sm:right-4 md:right-6 lg:right-8 bottom-20 sm:bottom-24 md:bottom-28 lg:bottom-32 z-50 w-[calc(100vw-1.5rem)] sm:w-96 md:w-[420px] h-[70vh] sm:h-[500px] md:h-[550px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col border-2 border-indigo-200"
          >
            {/* Header */}
            <motion.div 
              className="p-3 sm:p-4 bg-gradient-to-r from-emerald-500 via-green-600 to-emerald-500 text-white rounded-t-2xl flex justify-between items-center shadow-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">Medical Assistant</h3>
                  <p className="text-xs text-emerald-100">Powered by Gemini AI</p>
                </div>
              </div>
              <motion.button 
                onClick={() => setIsOpen(false)} 
                className="text-white hover:bg-white/20 rounded-full p-1.5 sm:p-2 transition-all duration-200"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </motion.button>
            </motion.div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[85%] sm:max-w-[80%] p-2.5 sm:p-3 rounded-2xl shadow-md ${
                    message.isBot 
                      ? 'bg-gradient-to-br from-white to-gray-50 text-gray-800 border border-gray-200' 
                      : 'bg-gradient-to-br from-emerald-500 to-green-600 text-white border border-emerald-600'
                  }`}>
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 p-3 sm:p-4 rounded-2xl shadow-md">
                    <div className="flex space-x-1.5 sm:space-x-2">
                      <motion.div 
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                        className="w-2 h-2 bg-emerald-500 rounded-full"
                      />
                      <motion.div 
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                        className="w-2 h-2 bg-emerald-500 rounded-full"
                      />
                      <motion.div 
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                        className="w-2 h-2 bg-emerald-500 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 sm:p-4 border-t-2 border-indigo-100 bg-white/80 backdrop-blur-sm rounded-b-2xl">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about your report..."
                  className="flex-1 p-2.5 sm:p-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-300 text-sm sm:text-base bg-white placeholder-gray-400"
                />
                <motion.button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 sm:p-3 bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-emerald-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;