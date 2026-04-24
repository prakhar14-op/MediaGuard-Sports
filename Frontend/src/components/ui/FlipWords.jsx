import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export const FlipWords = ({ words, interval = 2400, className = '' }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words, interval]);

  return (
    <span className={`relative inline-block overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
          exit={{    opacity: 0, y: -28, filter: 'blur(6px)' }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};
