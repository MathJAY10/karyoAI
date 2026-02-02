import  { useRef, useEffect, useState, MutableRefObject } from "react";

function useInView(threshold = 0.2): [MutableRefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}

export function CustomerStoriesSection() {
  const [ref1, inView1] = useInView();
  const [ref2, inView2] = useInView();
  const [ref3, inView3] = useInView();

  // Gradient border style similar to SIGN IN button
  const cardBorder = "p-[2px] bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-3xl";
  const cardInner = "bg-[#23243a] rounded-[22px] flex flex-col items-center text-center min-h-[380px] sm:min-h-[420px] h-full";

  return (
    <section className="py-16 sm:py-20 px-4 bg-[#18192a]">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-10 sm:mb-14 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 px-4">Customer Stories</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-4">
          {/* Card 1 */}
          <div
            ref={ref1}
            className={`${cardBorder} transition-all duration-[1800ms] ease-out ${inView1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ willChange: 'opacity, transform' }}
          >
            <div className={cardInner + " shadow-2xl p-6 sm:p-8 border border-purple-900/20"}>
              <img src="/coustmer1.jpg" alt="Sudeep Bansal" className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full object-cover mb-4 sm:mb-6 border-4 border-purple-500/30" />
              <div className="font-bold text-base sm:text-lg text-white mb-1">Sudeep Bansal</div>
              <div className="text-xs sm:text-sm text-purple-300 mb-3 sm:mb-4">VP of Wow Skin Science</div>
              <div className="text-sm sm:text-base text-gray-300 mb-4">Karyo AI helped us automate a major chunk of our backend operations.<br/>We believe AI is the future — and with Karyo, we're already there.<br/>Thanks to the team for building something so powerful, yet effortless to use.</div>
            </div>
          </div>
          {/* Card 2 */}
          <div
            ref={ref2}
            className={`${cardBorder} transition-all duration-[1800ms] ease-out delay-200 ${inView2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ willChange: 'opacity, transform' }}
          >
            <div className={cardInner + " shadow-2xl p-6 sm:p-8 border border-orange-900/20"}>
              <img src="/coustmer2.jpg" alt="Karthik Ranganathan" className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full object-cover mb-4 sm:mb-6 border-4 border-orange-400/30" />
              <div className="font-bold text-base sm:text-lg text-white mb-1">Karthik Ranganathan</div>
              <div className="text-xs sm:text-sm text-orange-300 mb-3 sm:mb-4">Assistant VP, eCommerce, The ThickShake Factory</div>
              <div className="text-sm sm:text-base text-gray-300 mb-4">We thought scaling meant hiring more people — until Karyo AI replaced our entire backend with automation.<br/>Now we run faster, leaner, and smarter — without extra staff.</div>
            </div>
          </div>
          {/* Card 3 */}
          <div
            ref={ref3}
            className={`${cardBorder} transition-all duration-[1800ms] ease-out delay-400 ${inView3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ willChange: 'opacity, transform' }}
          >
            <div className={cardInner + " shadow-2xl p-6 sm:p-8 border border-pink-900/20"}>
              <img src="/coustmer3.jpg" alt="Rajat Jaiswal" className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full object-cover mb-4 sm:mb-6 border-4 border-pink-400/30" />
              <div className="font-bold text-base sm:text-lg text-white mb-1">Rajat Jaiswal</div>
              <div className="text-xs sm:text-sm text-pink-300 mb-3 sm:mb-4">Co-founder, Wat-a-Burger</div>
              <div className="text-sm sm:text-base text-gray-300 mb-4">Karyo AI helped us cut operational expenses by over 70%.<br/>We now manage everything without hiring additional staff — it's like having a full backend team on autopilot.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 