import React from 'react';

const Logo = ({ className = "w-6 h-6", color = "currentColor" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 13V4l16 16v-9" />
      <path d="M20 4L4 20" />
    </svg>
  );
};

export default Logo;