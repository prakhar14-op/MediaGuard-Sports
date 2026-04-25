import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const WORDS = ['Detects', 'Adjudicates', 'Monetizes', 'Protects'];

const FlipWords = () => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % WORDS.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={idx}
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        exit={{   y: -32, opacity: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="inline-block text-teal-400"
        style={{
          textDecoration: 'underline',
          textDecorationColor: '#2dd4bf',
          textDecorationThickness: '3px',
          textUnderlineOffset: '6px',
        }}
      >
        {WORDS[idx]}
      </motion.span>
    </AnimatePresence>
  );
};

export default FlipWords;
