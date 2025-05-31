import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-blue-800 to-slate-900 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 shadow-xl"
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          <button
            onClick={() => navigate('/')}
            className="text-white hover:text-sky-300 transition-colors"
          >
            &larr; Back to Home
          </button>
        </div>

        <div className="space-y-6 text-white/90">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-sky-300">Data Collection and Usage</h2>
            <p className="mb-2">
              MedAI Analyzer collects and processes medical report data solely for the purpose of providing analysis and insights to users. We prioritize your privacy and handle all medical information with strict confidentiality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-sky-300">Data Security</h2>
            <p className="mb-2">
              We implement industry-standard security measures, including 256-bit encryption and HIPAA-compliant data handling procedures, to protect your medical information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-sky-300">Data Retention</h2>
            <p className="mb-2">
              Medical reports and analysis results are automatically deleted from our servers after 24 hours. You can manually delete your data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-sky-300">Third-Party Services</h2>
            <p className="mb-2">
              We use Google's Gemini AI for report analysis. All data shared with third-party services is encrypted and anonymized.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default PrivacyPolicy;