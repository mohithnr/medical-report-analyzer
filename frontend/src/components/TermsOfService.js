import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-blue-800 to-slate-900 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 shadow-xl"
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
          <button
            onClick={() => navigate('/')}
            className="text-white hover:text-sky-300 transition-colors"
          >
            &larr; Back to Home
          </button>
        </div>

        <div className="space-y-6 text-white/90">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-sky-300">Service Description</h2>
            <p className="mb-2">
              MedAI Analyzer provides AI-powered medical report analysis. Our service is intended to assist in understanding medical reports and should not be considered as medical advice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-sky-300">User Responsibilities</h2>
            <p className="mb-2">
              Users are responsible for the accuracy of uploaded reports and should consult healthcare professionals for medical decisions. Do not use this service for emergency medical situations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-sky-300">Limitations of Liability</h2>
            <p className="mb-2">
              MedAI Analyzer provides analysis based on AI interpretation and cannot guarantee complete accuracy. We are not liable for decisions made based on the analysis results.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-sky-300">Service Availability</h2>
            <p className="mb-2">
              We strive to maintain continuous service availability but cannot guarantee uninterrupted access. Maintenance or technical issues may temporarily affect service accessibility.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default TermsOfService;