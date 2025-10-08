import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { textToSpeech, cleanupAudioUrl, delay } from './Sarvam';

// Helper function to chunk text
const chunkText = (text, maxLen = 400) => {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLen;
    if (end < text.length) {
      // Try to break at sentence end
      let lastPeriod = text.lastIndexOf('.', end);
      let lastQuestion = text.lastIndexOf('?', end);
      let lastExclaim = text.lastIndexOf('!', end);
      let breakPoint = Math.max(lastPeriod, lastQuestion, lastExclaim);
      
      if (breakPoint > start) {
        end = breakPoint + 1;
      } else {
        // Fall back to space
        let lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start) end = lastSpace;
      }
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(chunk => chunk.length > 0);
};

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

// Speaker Icon Component
const SpeakerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const AudioPlayer = ({ parsedSummary, language = 'English' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioQueue, setAudioQueue] = useState([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [currentSection, setCurrentSection] = useState(null);
  const [isGeneratingQueue, setIsGeneratingQueue] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  const audioRef = useRef(null);
  const waitIntervalRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioQueue.forEach(url => cleanupAudioUrl(url));
      if (waitIntervalRef.current) {
        clearInterval(waitIntervalRef.current);
      }
    };
  }, [audioQueue]);

  // Handle audio ended event
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      console.log(`Audio ${currentAudioIndex + 1}/${audioQueue.length} ended`);
      
      if (currentAudioIndex < audioQueue.length - 1) {
        const nextIndex = currentAudioIndex + 1;
        console.log(`Playing next audio: ${nextIndex + 1}/${audioQueue.length}`);
        setCurrentAudioIndex(nextIndex);
        audio.src = audioQueue[nextIndex];
        audio.play().catch(err => {
          console.error('Error playing next audio:', err);
          stopPlayback();
        });
      } else if (isGeneratingQueue) {
        // Wait for the producer to enqueue next audio
        console.log('Waiting for next generated audio...');
        if (waitIntervalRef.current) clearInterval(waitIntervalRef.current);
        waitIntervalRef.current = setInterval(() => {
          if (audioQueue.length > currentAudioIndex + 1) {
            clearInterval(waitIntervalRef.current);
            waitIntervalRef.current = null;
            const nextIndex = currentAudioIndex + 1;
            console.log(`Resuming with next audio: ${nextIndex + 1}/${audioQueue.length}`);
            setCurrentAudioIndex(nextIndex);
            audio.src = audioQueue[nextIndex];
            audio.play().catch(err => {
              console.error('Error resuming playback:', err);
              stopPlayback();
            });
          } else if (!isGeneratingQueue) {
            clearInterval(waitIntervalRef.current);
            waitIntervalRef.current = null;
            console.log('Generation ended; stopping playback');
            stopPlayback();
          }
        }, 150);
      } else {
        console.log('All audio segments completed');
        stopPlayback();
      }
    };

    const handleError = (e) => {
      console.error('Audio playback error:', e);
      stopPlayback();
      alert('Audio playback error occurred. Please try again.');
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      if (waitIntervalRef.current) {
        clearInterval(waitIntervalRef.current);
        waitIntervalRef.current = null;
      }
    };
  }, [audioQueue, currentAudioIndex, isGeneratingQueue]);

  // Update audio source when index changes
  useEffect(() => {
    if (audioQueue.length > 0 && audioRef.current && isPlaying && !isGeneratingQueue) {
      audioRef.current.src = audioQueue[currentAudioIndex];
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
        stopPlayback();
      });
    }
  }, [currentAudioIndex]);

  const stopPlayback = () => {
    setIsPlaying(false);
    setAudioQueue([]);
    setCurrentAudioIndex(0);
    setCurrentSection(null);
    setProgress({ current: 0, total: 0 });
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
    }
    
    if (waitIntervalRef.current) {
      clearInterval(waitIntervalRef.current);
      waitIntervalRef.current = null;
    }
  };

  const handlePlayAllSections = async () => {
    if (!parsedSummary) {
      alert("No summary available to play.");
      return;
    }
    
    setIsPlaying(true);
    setAudioQueue([]);
    setCurrentAudioIndex(0);
    setIsGeneratingQueue(true);
    setProgress({ current: 0, total: 0 });

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Prepare sections in order
    const sections = [
      { label: "Key Findings", text: `Key Findings. ${parsedSummary.keyFindings}` },
      { 
        label: "Abnormalities", 
        text: `Abnormalities. ${parsedSummary.abnormalities.map(item =>
          `${item.test}. Result: ${item.result}. Normal Range: ${item.normalRange}. Finding: ${item.abnormality}.`
        ).join(' ')}` 
      },
      { label: "Recommended Steps", text: `Recommended Steps. ${parsedSummary.recommendedSteps}` },
      { label: "Health Advice", text: `Health Advice. ${parsedSummary.healthAdvice}` }
    ].filter(section => section.text && section.text.trim().length > 10);

    const allAudioUrls = [];
    let hasStartedPlayback = false;

    // Calculate total chunks for progress
    let totalChunks = 0;
    sections.forEach(section => {
      totalChunks += chunkText(section.text, 400).length;
    });
    setProgress({ current: 0, total: totalChunks });

    try {
      console.log(`Processing ${sections.length} sections with ${totalChunks} total chunks...`);
      
      let processedChunks = 0;
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        console.log(`\n📝 Processing section ${i + 1}/${sections.length}: ${section.label}`);
        setCurrentSection(section.label);
        
        // Split section text into smaller chunks
        const chunks = chunkText(section.text, 400);
        console.log(`   Split into ${chunks.length} chunks`);
        
        for (let j = 0; j < chunks.length; j++) {
          const chunk = chunks[j];
          
          try {
            console.log(`   🔄 Converting chunk ${j + 1}/${chunks.length} (${chunk.length} chars)...`);
            
            // Add delay BEFORE each API call (except first)
            if (allAudioUrls.length > 0) {
              await delay(1500); // 1.5 second delay between API calls
            }
            
            const url = await textToSpeech(chunk.trim(), language.toLowerCase());
            
            if (!url) {
              throw new Error('No audio URL returned');
            }
            
            allAudioUrls.push(url);
            processedChunks++;
            setProgress({ current: processedChunks, total: totalChunks });
            console.log(`   ✅ Generated audio ${allAudioUrls.length} (${processedChunks}/${totalChunks})`);

            // Start playback immediately with first audio
            if (!hasStartedPlayback && audioRef.current) {
              console.log('🎵 Starting playback...');
              setAudioQueue([url]);
              setCurrentAudioIndex(0);
              audioRef.current.src = url;
              try {
                await audioRef.current.play();
                hasStartedPlayback = true;
              } catch (playError) {
                console.error('Error starting playback:', playError);
                throw new Error('Failed to start audio playback');
              }
            } else {
              // Append to queue for sequential playback
              setAudioQueue(prev => [...prev, url]);
            }
            
          } catch (chunkError) {
            console.error(`❌ Error processing chunk ${j + 1}:`, chunkError);
            
            // If rate limited, wait longer and retry once
            if (chunkError.message.includes('Rate limit')) {
              console.log('⏳ Rate limited, waiting 10 seconds...');
              await delay(10000);
              try {
                const retryUrl = await textToSpeech(chunk.trim(), language.toLowerCase());
                if (retryUrl) {
                  allAudioUrls.push(retryUrl);
                  processedChunks++;
                  setProgress({ current: processedChunks, total: totalChunks });
                  setAudioQueue(prev => [...prev, retryUrl]);
                  console.log('✅ Retry successful');
                  continue;
                }
              } catch (retryError) {
                console.error('Retry failed:', retryError);
              }
            }
            
            throw new Error(`Failed at ${section.label}, chunk ${j + 1}: ${chunkError.message}`);
          }
        }
        
        // Short delay between sections
        if (i < sections.length - 1) {
          await delay(500);
        }
      }
      
      console.log(`\n🎉 Successfully created ${allAudioUrls.length} audio segments`);
      
    } catch (error) {
      console.error('❌ Error in handlePlayAllSections:', error);
      
      // Cleanup on error
      stopPlayback();
      
      // Clean up any created audio URLs
      allAudioUrls.forEach(url => cleanupAudioUrl(url));
      
      alert(`Failed to play all sections: ${error.message}\n\nTip: Try reducing the report size or play individual sections instead.`);
    } finally {
      setIsGeneratingQueue(false);
      setCurrentSection(null);
    }
  };

  return (
    <>
      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />

      {/* Play All Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handlePlayAllSections}
        disabled={isPlaying}
        className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed fixed bottom-8 right-8 z-50 w-14 h-14 flex items-center justify-center shadow-lg"
        title="Play All Sections"
      >
        {isPlaying ? <LoadingSpinner /> : <SpeakerIcon />}
      </motion.button>

      {/* Stop Button (shown when playing) */}
      {isPlaying && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={stopPlayback}
          className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 fixed bottom-8 right-24 z-50 w-14 h-14 flex items-center justify-center shadow-lg"
          title="Stop Playback"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <rect x="6" y="6" width="8" height="8" rx="1" />
          </svg>
        </motion.button>
      )}

      {/* Progress Indicator */}
      {isPlaying && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-28 right-8 z-50 bg-white rounded-lg shadow-lg p-3 min-w-[200px]"
        >
          <div className="text-sm font-semibold text-gray-800 mb-1">
            {currentSection || 'Playing...'}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`
                }}
              />
            </div>
            <span className="text-xs text-gray-600">
              {progress.current}/{progress.total}
            </span>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default AudioPlayer;