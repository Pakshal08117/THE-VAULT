import React from 'react';
import { motion } from 'framer-motion';

const ringText = [
  'SECURE',
  'PRIVATE',
  'ENCRYPTED',
  'PROTECTED',
  'WRITINGS',
  'MEMORIES',
  'THOUGHTS',
  'VAULT'
];

export const TextRingOrb: React.FC = () => {
  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.2),transparent_40%)]" />
      <div className="absolute inset-0 rounded-full border border-vault-gold/20 shadow-[0_0_40px_rgba(212,175,55,0.16)]" />

      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 24, ease: 'linear' }}
      >
        <div className="absolute inset-0">
          {ringText.map((word, index) => {
            const angle = (360 / ringText.length) * index;
            return (
              <span
                key={word}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.35em] text-vault-gold/85"
                style={{
                  transform: `rotate(${angle}deg) translateY(-88px) rotate(${-angle}deg)`
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        className="relative flex h-24 w-24 items-center justify-center rounded-full border border-vault-gold/20 bg-black/80 shadow-[0_0_30px_rgba(212,175,55,0.12)]"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.22),transparent_48%)]" />
        <span className="relative z-10 font-serif text-3xl font-bold text-vault-gold drop-shadow-[0_0_12px_rgba(212,175,55,0.45)]">
          V
        </span>
      </motion.div>

      <motion.span
        className="absolute left-[14%] top-[18%] h-2.5 w-2.5 rounded-full bg-vault-gold/85 shadow-[0_0_10px_rgba(212,175,55,0.2)]"
        animate={{ x: [0, 6, 0], y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 4.4, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute right-[16%] top-[24%] h-2 w-2 rounded-full bg-vault-gold/75 shadow-[0_0_10px_rgba(212,175,55,0.2)]"
        animate={{ x: [0, -6, 0], y: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 5.2, ease: 'easeInOut', delay: 0.8 }}
      />
      <motion.span
        className="absolute bottom-[16%] left-[28%] h-2 w-2 rounded-full bg-vault-gold/75 shadow-[0_0_10px_rgba(212,175,55,0.18)]"
        animate={{ x: [0, 5, 0], y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 4.6, ease: 'easeInOut', delay: 1.2 }}
      />
    </div>
  );
};

export default TextRingOrb;
