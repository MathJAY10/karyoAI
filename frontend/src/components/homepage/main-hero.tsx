import React from "react";
import {  useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function MainHero() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      const el = document.getElementById('hero-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section id="main-hero" className="py-8 px-4 sm:px-6 relative overflow-hidden" style={{ background: 'var(--journova-card)' }}>
      {/* Orbit SVG and Floating Balls Background */}
      <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" viewBox="0 0 1440 600" fill="none" xmlns="http://www.w3.org/2000/svg" style={{minHeight: 600}}>
        {/* Orbits */}
        <ellipse cx="720" cy="300" rx="600" ry="220" stroke="#3a4374" strokeWidth="1.5" opacity="0.25" />
        <ellipse cx="720" cy="300" rx="400" ry="150" stroke="#4a5490" strokeWidth="1.5" opacity="0.18" />
        <ellipse cx="720" cy="300" rx="250" ry="90" stroke="#5a6bb8" strokeWidth="1.5" opacity="0.12" />
        {/* Floating Balls (Planets) */}
        <circle className="floating-orb" cx="220" cy="120" r="14" fill="#ff6bcb" opacity="0.8" />
        <circle className="floating-orb" cx="1240" cy="180" r="10" fill="#6be7ff" opacity="0.7" />
        <circle className="floating-orb" cx="400" cy="500" r="8" fill="#f7b731" opacity="0.7" />
        <circle className="floating-orb" cx="1100" cy="480" r="12" fill="#a685ff" opacity="0.7" />
        <circle className="floating-orb" cx="900" cy="100" r="7" fill="#ffb86b" opacity="0.7" />
      </svg>
      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Company Badge */}
        <div className="mb-6 sm:mb-8">
          <div className="inline-block px-4 sm:px-6 py-2 bg-gray-800/20 backdrop-blur-sm rounded-full border border-gray-600/30">
            <span className="text-xs sm:text-sm text-gray-300 tracking-wide">A product by Karyo AI Technologies</span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold mb-6 sm:mb-8 leading-tight">
          <div className="mb-2 sm:mb-4">
            India's #1{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">AI Agent</span>
              {/* Journova-style underline - adjusted positioning */}
              <div className="absolute -bottom-2 sm:-bottom-3 left-0 right-0 h-1 sm:h-2 bg-gradient-to-r from-yellow-400 via-green-400 to-purple-400 rounded-full"></div>
            </span>
          </div>
          <div className="mt-2 sm:mt-4">
            for Business
          </div>
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-4xl sm:max-w-5xl mx-auto leading-relaxed px-4">
          The AI-powered business assistant that helps you automate, analyze, and evolve one task at a time.
        </p>

        {/* GET STARTED Button matching SIGN IN style */}
        <a
          href="#hero-section"
          className="relative p-[2px] rounded-lg bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 hover:shadow-lg transition-all duration-200 inline-block"
          onClick={handleGetStarted}
        >
          <div className="bg-white rounded-md px-6 sm:px-8 py-3 flex items-center justify-center">
            <span className="text-purple-900 font-semibold text-base sm:text-lg tracking-wide">GET STARTED</span>
          </div>
        </a>

        {/* Premium Dashboard Preview */}
        <div className="flex justify-center mt-10 sm:mt-14 mb-8 sm:mb-12 relative px-4">
          <div className="relative bg-white/5 rounded-2xl p-[2px] bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 w-full max-w-3xl sm:max-w-4xl lg:max-w-[900px] transition-all duration-300"
            style={{ aspectRatio: '16/7', minHeight: '220px' }}>
            <div className="rounded-2xl overflow-hidden bg-[#18192a] relative w-full h-full">
              <video
                src="/vid.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover rounded-2xl"
                style={{ minHeight: '220px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Customer Stories Section
export function CustomerStoriesSection() {
  return (
    <section className="py-16 sm:py-20 px-4 bg-[#f8fafc] dark:bg-[#18192a]">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-10 sm:mb-14 text-gray-900 dark:text-white px-4">Customer Stories</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-4">
          {/* Card 1 */}
          <div className="rounded-3xl bg-white dark:bg-[#23243a] shadow-xl p-6 sm:p-8 flex flex-col items-center text-center border border-gray-200 dark:border-gray-700 min-h-[380px] sm:min-h-[420px]">
            <img src="/customer1.jpg" alt="Sudeep Bansal" className="w-24 sm:w-28 h-24 sm:h-28 rounded-full object-cover mb-4 sm:mb-6 border-4 border-gray-100 dark:border-[#23243a]" />
            <div className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-1">Sudeep Bansal</div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">VP of Wow Skin Science</div>
            <div className="text-sm sm:text-base text-gray-700 dark:text-gray-200 mb-4">Karyo AI helped us automate a major chunk of our backend operations.<br/>We believe AI is the future — and with Karyo, we're already there.<br/>Thanks to the team for building something so powerful, yet effortless to use.</div>
          </div>
          {/* Card 2 */}
          <div className="rounded-3xl bg-white dark:bg-[#23243a] shadow-xl p-6 sm:p-8 flex flex-col items-center text-center border border-gray-200 dark:border-gray-700 min-h-[380px] sm:min-h-[420px]">
            <img src="/customer2.jpg" alt="Karthik Ranganathan" className="w-24 sm:w-28 h-24 sm:h-28 rounded-full object-cover mb-4 sm:mb-6 border-4 border-gray-100 dark:border-[#23243a]" />
            <div className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-1">Karthik Ranganathan</div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">Assistant VP, eCommerce, The ThickShake Factory</div>
            <div className="text-sm sm:text-base text-gray-700 dark:text-gray-200 mb-4">We thought scaling meant hiring more people — until Karyo AI replaced our entire backend with automation.<br/>Now we run faster, leaner, and smarter — without extra staff.</div>
          </div>
          {/* Card 3 */}
          <div className="rounded-3xl bg-white dark:bg-[#23243a] shadow-xl p-6 sm:p-8 flex flex-col items-center text-center border border-gray-200 dark:border-gray-700 min-h-[380px] sm:min-h-[420px]">
            <img src="/customer3.jpg" alt="Rajat Jaiswal" className="w-24 sm:w-28 h-24 sm:h-28 rounded-full object-cover mb-4 sm:mb-6 border-4 border-gray-100 dark:border-[#23243a]" />
            <div className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-1">Rajat Jaiswal</div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">Co-founder, Wat-a-Burger</div>
            <div className="text-sm sm:text-base text-gray-700 dark:text-gray-200 mb-4">Karyo AI helped us cut operational expenses by over 70%.<br/>We now manage everything without hiring additional staff — it's like having a full backend team on autopilot.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
