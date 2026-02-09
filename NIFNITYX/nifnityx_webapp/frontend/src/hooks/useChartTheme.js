import { useEffect, useState } from 'react';

export const useChartTheme = () => {
  // Lightweight Charts DOES NOT support 'oklch()' colors.
  // We return hardcoded HEX values that match the "True Dark" theme (Zinc palette).
  
  return {
    background: 'transparent', 
    textColor: '#e4e4e7', // zinc-200 (Matches dark mode text)
    lineColor: '#27272a', // zinc-800 (Matches dark mode borders)
    upColor: '#22c55e',   // green-500
    downColor: '#ef4444', // red-500
  };
};