
export function AboutUs() {
  return (
    <section
      id="about-us"
      className="py-16 sm:py-20 px-4 sm:px-6 bg-[#18192a] animate-fade-in-up"
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Who are we?</span>
          </h2>
          <div className="w-12 sm:w-16 h-0.5 sm:h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto"></div>
        </div>
        <div className="bg-[#232334] rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 lg:p-14 border border-[#232334] relative overflow-hidden">
          <div className="absolute -top-8 sm:-top-10 -right-8 sm:-right-10 w-32 sm:w-40 h-32 sm:h-40 bg-gradient-to-br from-purple-700/30 to-pink-500/10 rounded-full blur-2xl z-0"></div>
          <div className="absolute -bottom-8 sm:-bottom-10 -left-8 sm:-left-10 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-tr from-yellow-400/20 to-orange-400/10 rounded-full blur-2xl z-0"></div>
          <div className="relative z-10">
            <p className="text-gray-300 text-base sm:text-lg md:text-xl leading-relaxed mb-4 sm:mb-6">
              <span className="font-semibold text-white">Karyo AI</span> is India's first all-in-one AI automation platform designed specifically for fast-scaling businesses and professionals. In a world where time is money, we bring you tools that simplify your most repetitive tasks — from Excel analytics and PDF processing to AI-powered chat, email writing, customer replies, and CRM workflows — all in one seamless dashboard.
            </p>
            <p className="text-gray-400 text-sm sm:text-base md:text-lg leading-relaxed mb-4 sm:mb-6">
              Our platform is built to save <span className="text-purple-400 font-semibold">1000+ human hours every year</span>, helping businesses reduce operational costs by up to <span className="text-orange-400 font-semibold">60%</span>, while managing <span className="text-pink-400 font-semibold">10× more workload</span> without hiring extra staff.
            </p>
            <p className="text-gray-400 text-sm sm:text-base md:text-lg leading-relaxed mb-4 sm:mb-6">
              Today, over <span className="text-green-400 font-semibold">500+ businesses</span> trust Karyo AI to streamline their daily operations and boost team productivity.
            </p>
            <p className="text-gray-400 text-sm sm:text-base md:text-lg leading-relaxed mb-4 sm:mb-6">
              Behind Karyo AI is a dedicated team of developers, designers, and growth-focused minds with over <span className="text-yellow-400 font-semibold">20+ years</span> of combined experience in software, automation, and business transformation. We're not just building another tool — we're building your AI-powered virtual teammate.
            </p>
            <p className="text-gray-400 text-sm sm:text-base md:text-lg leading-relaxed">
              We believe AI should be <span className="text-purple-400 font-semibold">simple</span>, <span className="text-orange-400 font-semibold">affordable</span>, and <span className="text-pink-400 font-semibold">accessible</span> — and that's exactly what <span className="font-semibold text-white">Karyo AI</span> delivers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


// Render Rating and Feedback after AboutUs
export default function AboutUsWithExtras() {
  return (
    <>
      <AboutUs />
      
    </>
  );
}

// Tailwind animation utility (add to your global CSS if not present):
// .animate-fade-in-up {
//   @apply opacity-0 translate-y-8;
//   animation: fadeInUp 0.8s cubic-bezier(0.4,0,0.2,1) 0.1s forwards;
// }
// @keyframes fadeInUp {
//   to {
//     opacity: 1;
//     transform: translateY(0);
//   }
// } 