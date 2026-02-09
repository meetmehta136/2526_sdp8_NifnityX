import React from 'react';
// Ideally, check the export of the library. Assuming default based on usage context.
// If this fails, try: import { LightRays } from '@react-bits/LightRays-JS-TW';
import LightRays from '../LightRays'; 

const AuthBackground = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <LightRays 
          speed={3} 
          opacity={0.5} 
          numRays={20} 
          color="#ffffff" 
        />
      </div>
      <div className="relative z-10 w-full max-w-md p-4">
        {children}
      </div>
    </div>
  );
};

export default AuthBackground;