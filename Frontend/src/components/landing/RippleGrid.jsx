import React, { useState, useMemo } from 'react';

const RippleGrid = ({ rows = 12, cols = 26, cellSize = 56 }) => {
  const [clicked, setClicked] = useState(null);
  const [key, setKey] = useState(0);
  const cells = useMemo(() => Array.from({ length: rows * cols }, (_, i) => i), [rows, cols]);

  return (
    <div
      className="absolute inset-0 overflow-hidden z-0"
      style={{
        maskImage: 'radial-gradient(ellipse 100% 80% at 50% 0%, black 20%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 100% 80% at 50% 0%, black 20%, transparent 100%)',
      }}
    >
      <div
        className="pointer-events-auto cursor-crosshair"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          width: cols * cellSize,
          marginInline: 'auto',
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setClicked({
            row: Math.floor((e.clientY - rect.top) / cellSize),
            col: Math.floor((e.clientX - rect.left) / cellSize),
          });
          setKey((k) => k + 1);
        }}
      >
        {cells.map((idx) => {
          const r = Math.floor(idx / cols);
          const c = idx % cols;
          const dist = clicked ? Math.hypot(clicked.row - r, clicked.col - c) : 0;
          return (
            <div
              key={`${key}-${idx}`}
              className={`border border-teal-500/8 hover:bg-teal-400/8 transition-colors duration-75 will-change-transform ${clicked ? 'animate-cell-ripple' : ''}`}
              style={{
                width: cellSize,
                height: cellSize,
                '--delay': `${clicked ? Math.max(0, dist * 26) : 0}ms`,
                '--duration': `${120 + dist * 44}ms`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RippleGrid;
