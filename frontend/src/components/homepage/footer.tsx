import { Instagram, Linkedin, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-[#18192a] py-6 px-4 flex flex-col md:flex-row items-center justify-between border-t border-[#232334] mt-12">
      <span className="text-gray-400 text-sm mb-4 md:mb-0">© 2025 Karyo AI Technologies. All rights reserved.</span>
      <div className="flex gap-4">
        <a href="https://wa.me/karyoai" target="_blank" rel="noopener noreferrer" className="group">
          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-[#232334] hover:bg-[#2e2e3a] transition-colors">
            <MessageCircle className="text-gray-400 group-hover:text-green-400 transition-colors" size={22} />
          </span>
        </a>
        <a href="https://www.instagram.com/karyo.ai?igsh=cmJjYWtibWo4czh0" target="_blank" rel="noopener noreferrer" className="group">
          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-[#232334] hover:bg-[#2e2e3a] transition-colors">
            <Instagram className="text-gray-400 group-hover:text-pink-400 transition-colors" size={22} />
          </span>
        </a>
        <a href="https://www.linkedin.com/in/karyo-ai-611575373?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" target="_blank" rel="noopener noreferrer" className="group">
          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-[#232334] hover:bg-[#2e2e3a] transition-colors">
            <Linkedin className="text-gray-400 group-hover:text-blue-400 transition-colors" size={22} />
          </span>
        </a>
      </div>
    </footer>
  );
} 