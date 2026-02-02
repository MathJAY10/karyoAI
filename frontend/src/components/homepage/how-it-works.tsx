import { CheckCircle, MessageCircle,  Bot, ClipboardList ,FileCheck2 } from 'lucide-react';

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-20 md:py-24 px-4 bg-[#18192a]">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-12">
        {/* Left: Headline and Steps */}
        <div className="flex-1 min-w-0 w-full lg:min-w-[320px]">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 sm:mb-8 text-white tracking-tight">
            How <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">Karyo AI</span> Works
          </h2>
          <ul className="space-y-6 sm:space-y-8">
            <li className="flex items-start gap-3 sm:gap-4">
              <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400 mt-0.5 sm:mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-white text-base sm:text-lg mb-1">💬 Your Request</div>
                <div className="text-gray-400 text-sm sm:text-base">Type any task or command – from lead handling to document drafting.</div>
              </div>
            </li>
            <li className="flex items-start gap-3 sm:gap-4">
              <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-purple-400 mt-0.5 sm:mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-white text-base sm:text-lg mb-1">🧠 AI Agent with Deep Logic</div>
                <div className="text-gray-400 text-sm sm:text-base">Karyo's agents analyze your intent, pick the best strategy, and act.</div>
              </div>
            </li>
            <li className="flex items-start gap-3 sm:gap-4">
              <ClipboardList className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-300 mt-0.5 sm:mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-white text-base sm:text-lg mb-1">Tool Automation – Done for You</div>
                <div className="text-gray-400 text-sm sm:text-base">Auto-connects with tools like Excel, PDFs, Emails, Docs & more.</div>
              </div>
            </li>
            <li className="flex items-start gap-3 sm:gap-4">
              <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-green-400 mt-0.5 sm:mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-white text-base sm:text-lg mb-1">✅ Smart, Instant Output</div>
                <div className="text-gray-400 text-sm sm:text-base">Delivers formatted, accurate, ready-to-use results — 10× faster</div>
              </div>
            </li>
          </ul>
        </div>
        {/* Right: Chat/Browser Mockup */}
        <div className="flex-1 flex justify-center w-full">
          <div className="w-full max-w-lg lg:max-w-xl bg-[#18192a] rounded-2xl shadow-2xl border border-white/10 p-0 overflow-hidden">
            {/* Browser bar */}
            <div className="flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-[#23243a] border-b border-white/10">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-400 mr-1 sm:mr-2"></div>
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-400 mr-1 sm:mr-2"></div>
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-400 mr-2 sm:mr-4"></div>
              <div className="flex-1 text-xs text-gray-400 truncate">https://karyoai.com/agent</div>
            </div>
            {/* Chat area */}
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 bg-[#18192a]">
              {/* Logo and Title */}
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <img src="/karyo-logo.png" alt="Karyo Agent" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full" />
                <span className="text-white font-semibold text-base sm:text-lg tracking-wide">Karyo Agent</span>
              </div>
              {/* User message */}
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">U</div>
                <div className="bg-[#23243a] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-white text-sm sm:text-base max-w-[80%] border border-white/10">Type any task or command – from lead handling to document drafting.</div>
              </div>
              {/* Agent thinking */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">A</div>
                <div className="bg-transparent rounded-2xl px-3 sm:px-4 py-2 text-gray-300 text-sm sm:text-base max-w-[80%]">Karyo's agents analyze your intent, pick the best strategy, and act.</div>
                <div className="ml-auto flex-shrink-0"><Bot className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" /></div>
              </div>
              {/* Tool automation */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">A</div>
                <div className="bg-[#23243a] rounded-2xl px-3 sm:px-4 py-2 text-cyan-300 text-sm sm:text-base max-w-[80%] flex items-center gap-2">Auto-connects with tools like Excel, PDFs, Emails, Docs & more.</div>
                <div className="ml-auto flex-shrink-0"><ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" /></div>
              </div>
              {/* Output */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm">A</div>
                <div className="bg-green-900/80 rounded-2xl px-3 sm:px-4 py-2 text-green-300 text-sm sm:text-base max-w-[80%] flex items-center gap-2 border border-green-400/20"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> Delivers formatted, accurate, ready-to-use results — 10× faster</div>
                <div className="ml-auto flex-shrink-0"><FileCheck2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-300" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
