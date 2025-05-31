import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyCZfsorcLmb9R2S9eQUnBg_t8qj-zAykec");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed right-6 bottom-24 z-50 w-80 h-96 bg-white rounded-xl shadow-2xl flex flex-col"
          >
            <div className="p-4 bg-emerald-600 text-white rounded-t-xl flex justify-between items-center">
              <h3 className="font-semibold">Medical Assistant</h3>
              <button onClick={() => setIsOpen(false)} className="text-white hover:text-emerald-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-xl ${message.isBot ? 'bg-gray-100 text-gray-800' : 'bg-emerald-600 text-white'}`}>
                    {message.text}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-xl">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask a question..."
                  className="flex-1 p-2 border rounded-lg focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleSend}
                  className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
