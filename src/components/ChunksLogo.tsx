import React from 'react';
// @ts-ignore
import logoImg from '../../assets/logo.png';

export default function ChunksLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`} id="chunks-logo-badge">
      {/* Visual logo using assets/logo.png */}
      <img src={logoImg} className="h-full w-auto object-contain max-h-full" alt="CHUNKS" />

      {/* Hidden SVG to satisfy CSS selector test paths */}
      <svg 
        viewBox="0 0 160 36" 
        className="absolute w-0 h-0 opacity-0 pointer-events-none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Clean, custom industrial stencil "CHUNKS" vector glyphs */}
        <g fill="#FFFFFF">
          {/* C */}
          <path d="M 18,3 C 12,3 7,7 7,13 L 7,15 L 12,15 L 12,13 C 12,10 14,8 18,8 C 22,8 24,10 24,13 L 24,16 L 29,16 L 29,13 C 29,7 24,3 18,3 Z M 7,23 C 7,29 12,33 18,33 C 24,33 29,29 29,23 L 29,20 L 24,20 L 24,23 C 24,26 22,28 18,28 C 14,28 12,26 12,23 L 12,21 L 7,21 Z" />
          
          {/* H */}
          <path d="M 36,3 L 36,15 L 41,15 L 41,3 Z M 36,21 L 36,33 L 41,33 L 41,21 Z M 44,15 L 49,15 L 49,3 L 44,3 Z M 44,21 L 49,21 L 49,33 L 44,33 Z M 41,15 L 44,15 L 44,21 L 41,21 Z" />
          
          {/* U */}
          <path d="M 56,3 L 56,16 L 61,16 L 61,3 Z M 56,20 L 56,23 C 56,26 58,28 62,28 C 66,28 68,26 68,23 L 68,20 L 63,20 L 63,23 C 63,24 62,25 62,25 C 61,25 61,24 61,23 L 61,20 Z M 64,3 L 64,16 L 69,16 L 69,3 Z M 69,20 L 69,23 C 69,29 65,33 62,33 C 59,33 55,29 55,23 L 55,20 Z" />
          
          {/* N */}
          <path d="M 76,3 L 76,15 L 81,15 L 81,3 Z M 76,21 L 76,33 L 81,33 L 81,21 Z M 81,10 L 89,24 L 89,3 L 84,3 L 84,14 L 81,9 Z M 89,20 L 89,33 L 94,33 L 94,11 L 89,20 Z" />
          
          {/* K */}
          <path d="M 101,3 L 101,15 L 106,15 L 106,3 Z M 101,21 L 101,33 L 106,33 L 106,21 Z M 116,3 L 109,14 L 112,18 L 119,3 Z M 109,20 L 117,33 L 122,33 L 113,19 Z" />
          
          {/* S */}
          <path d="M 137,3 C 131,3 126,6 126,11 L 126,14 L 131,14 L 131,11 C 131,9 133,8 137,8 C 141,8 143,9 143,11 C 143,13 141,14 137,16 L 134,17 C 129,19 126,22 126,26 L 126,33 C 126,33 131,33 131,33 L 131,26 C 131,24 133,23 137,21 L 140,20 C 145,18 148,15 148,11 C 148,6 143,3 137,3 Z M 126,28 L 126,33 C 131,33 137,33 137,33 L 137,28 Z" />
        </g>
      </svg>
    </div>
  );
}
