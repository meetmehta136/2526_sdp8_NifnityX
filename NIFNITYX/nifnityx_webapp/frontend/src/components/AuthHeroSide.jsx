import React from 'react';
import { Zap, ShieldCheck, Cpu, TrendingUp } from 'lucide-react';
import FaultyTerminal from './FaultyTerminal';
import ScrambledText from './ScrambledText';

const AuthHeroSide = ({ title, scrambleChars }) => {
  return (
    <div className="hidden lg:flex relative w-[60%] h-full flex-col justify-center p-16 border-r border-zinc-800/30 select-none cursor-default">
      <div className="absolute inset-0 z-0">
        <FaultyTerminal
          scale={1.5}
          gridMul={[2, 1]}
          digitSize={1.2}
          timeScale={0.5}
          pause={false}
          scanlineIntensity={0.5}
          glitchAmount={1}
          flickerAmount={1}
          noiseAmp={1}
          chromaticAberration={0}
          dither={0}
          curvature={0.1}
          tint="#A7EF9E"
          mouseReact={true}
          mouseStrength={0.5}
          pageLoadAnimation={true}
          brightness={0.2}
        />
      </div>

      <div className="relative z-10 flex flex-col gap-10 max-w-2xl">
        <div className="flex flex-col gap-3">
          <span className="text-[#A7EF9E] font-mono text-xs tracking-[0.5em] uppercase opacity-70">{title}</span>
          <ScrambledText
            className="!m-0 !max-w-none text-6xl font-black tracking-tighter text-white leading-none font-['JetBrains_Mono']"
            scrambleChars={scrambleChars}
          >
            NIFNITYX: THE EDGE IN EVERY TRADE
          </ScrambledText>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-10 mt-4">
          <div className="flex flex-col gap-4 group">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#A7EF9E] transition-all duration-500 shadow-lg shadow-green-900/5 group-hover:border-[#A7EF9E]/30">
              <Cpu size={28} />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-white font-semibold text-lg font-['JetBrains_Mono']">3-Layer Signal Engine</h3>
              <p className="text-zinc-200 text-sm leading-relaxed font-light opacity-80">Technical + Sentiment + ML scoring for comprehensive setups.</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 group">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#A7EF9E] transition-all duration-500 shadow-lg shadow-green-900/5 group-hover:border-[#A7EF9E]/30">
              <Zap size={28} />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-white font-semibold text-lg font-['JetBrains_Mono']">Real-Time Execution</h3>
              <p className="text-zinc-200 text-sm leading-relaxed font-light opacity-80">Sub-second paper & live trading for NIFTY 50 derivatives.</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 group">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#A7EF9E] transition-all duration-500 shadow-lg shadow-green-900/5 group-hover:border-[#A7EF9E]/30">
              <ShieldCheck size={28} />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-white font-semibold text-lg font-['JetBrains_Mono']">Risk Management</h3>
              <p className="text-zinc-200 text-sm leading-relaxed font-light opacity-80">4 strategy profiles with active auto-degradation controls.</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 group">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#A7EF9E] transition-all duration-500 shadow-lg shadow-green-900/5 group-hover:border-[#A7EF9E]/30">
              <TrendingUp size={28} />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-white font-semibold text-lg font-['JetBrains_Mono']">Advanced Analytics</h3>
              <p className="text-zinc-200 text-sm leading-relaxed font-light opacity-80">Monitor equity curves, ML accuracy, and friction impact.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthHeroSide;
