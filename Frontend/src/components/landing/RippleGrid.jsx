import React, { useState } from 'react';

const RippleGrid = () => {
  const [ripple, setRipple] = useState(null);
  const [key, setKey] = useState(0);
  const cols = 22, rows = 9, size = 68;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none z-0"
      style={{ maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, black 30%, transparent 100%)' }}
    >
      <div
        className="pointer-events-auto"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${size}px)`, width: cols * size, margin: '0 auto' }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const col = Math.floor((e.clientX - rect.left) / size);
          const row = Math.floor((e.clientY - rect.top) / size);
          setRipple({ col, row });
          setKey(k => k + 1);
        }}
      >
        {Array.from({ length: cols * rows }).map((_, i) => {
          const c = i % cols, r = Math.floor(i / cols);
          const dist = ripple ? Math.hypot(ripple.col - c, ripple.row - r) : 0;
          const delay = ripple ? dist * 28 : 0;
          return (
            <div
              key={`${key}-${i}`}
              className="border border-blue-500/10 hover:bg-blue-500/8 transition-colors duration-150"
              style={{
                width: size, height: size,
                animation: ripple ? `cellPulse 380ms ${delay}ms ease-out both` : 'none',
              }}
            />
          );
        })}
      </div>
      <style>{`
        @keyframes cellPulse {
          0%   { background-color: transparent; }
          30%  { background-color: rgba(59,130,246,0.18); }
          100% { background-color: transparent; }
        }
      `}</style>
    </div>
  );
};

export default RippleGrid;
