import { Phone, Mail } from "lucide-react"

export function ConnectUs() {
  return (
    <section className="w-full flex justify-center items-center py-8 sm:py-12 md:py-16 px-2 sm:px-4">
      <div
        className="w-full max-w-5xl rounded-3xl p-[2px] bg-gradient-to-r from-purple-500 via-pink-400 to-orange-300 shadow-lg"
        style={{ boxShadow: "0 2px 24px 0 rgba(44,40,84,0.12)" }}
      >
        <div className="rounded-[22px] w-full h-full bg-[#18192a] p-4 sm:p-8 md:p-16 flex flex-col items-center">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 text-center">Want to Connect?</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-6 sm:mb-10 text-center max-w-2xl">
            We’d love to hear from you — whether you're a business looking to scale with AI, a partner, or just curious about what we do.
          </p>
          <div className="flex flex-col md:flex-row gap-2 sm:gap-4 w-full items-center justify-center">
            <a
              href="tel:+919151055193"
              className="px-6 sm:px-10 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold bg-gradient-to-r from-purple-600 to-orange-400 text-white shadow-md hover:from-purple-600 hover:to-orange-400 transition-colors duration-200 text-center flex items-center gap-2 w-full md:w-auto justify-center"
            >
              <Phone className="w-5 h-5 text-green-400" />
              Call us: ‪+91 91510 55193‬
            </a>
            <a
              href="mailto:hello@karyoai.com"
              className="px-6 sm:px-10 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold bg-[#232232] text-white shadow-md hover:bg-[#2a293a] transition-colors duration-200 text-center flex items-center gap-2 w-full md:w-auto justify-center"
            >
              <Mail className="w-5 h-5 text-blue-400" />
              Email: hello@karyoai.com
            </a>
          </div>
        </div>
      </div>
    </section>
  );
} 