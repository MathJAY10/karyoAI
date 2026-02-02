"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Users, Zap, TrendingUp, Share2, Shield } from "lucide-react"
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export function InteractiveFeatureCards() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      const el = document.getElementById('hero-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const features = [
    {
      title: "Empower Your Whole Team with Cutting-Edge AI",
      description: "Unlimited users, shared pool of credits",
      features: ["Unlimited users, shared pool of credits", "No per-user fees – everyone gets full access"],
      borderColor: "border-cyan-500/30",
      icon: Users,
      iconBg: "bg-purple-500",
      buttonColor: "text-cyan-400 hover:text-cyan-300",
    },
    {
      title: "Access Multiple Premium AIs Without Breaking the Bank",
      description: "Use GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, and more.",
      features: [
        "Use GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, and more.",
        "Pay only for what you use – no subscriptions.",
        "10x more cost-effective than competitors",
      ],
      borderColor: "border-yellow-500/30",
      icon: Zap,
      iconBg: "bg-yellow-500",
      buttonColor: "text-yellow-400 hover:text-yellow-300",
    },
    {
      title: "Flexible AI Power for Growing Businesses",
      description: "Add team members anytime at no extra cost.",
      features: [
        "Add team members anytime at no extra cost.",
        "Boost productivity across all departments.",
        "Perfect for small teams to mid-sized companies",
      ],
      borderColor: "border-purple-500/30",
      icon: TrendingUp,
      iconBg: "bg-green-500",
      buttonColor: "text-purple-400 hover:text-purple-300",
    },
    {
      title: "Collaborate Smarter, Not Harder",
      description: "Unlimited users, shared pool of credits",
      features: [
        "Unlimited users, shared pool of credits",
        "Shared workspaces and prompts.",
        "Pool resources for key projects.",
      ],
      borderColor: "border-cyan-500/30",
      icon: Share2,
      iconBg: "bg-purple-500",
      buttonColor: "text-cyan-400 hover:text-cyan-300",
    },
    {
      title: "Future-Proof Your Business",
      description: "Stay competitive with advanced features and cutting-edge AI tools",
      features: [
        "Stay competitive with advanced features and cutting-edge AI tools",
        "No lock-in. Adapt to changing needs without long-term commitments",
        "Experiment and innovate risk-free",
      ],
      borderColor: "border-yellow-500/30",
      icon: Shield,
      iconBg: "bg-yellow-500",
      buttonColor: "text-yellow-400 hover:text-yellow-300",
    },
  ]

  return (
    <section id="interactive-feature-cards" className="py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 px-4">Unleash AI power across your entire team</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`card-journova ${feature.borderColor.includes('cyan') ? 'card-border-blue' : feature.borderColor.includes('yellow') ? 'card-border-yellow' : 'card-border-purple'} relative overflow-hidden transition-all duration-300 cursor-pointer p-4 sm:p-6 lg:p-8 transform ${hoveredCard === index ? 'scale-105' : 'scale-100'}`}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Background Image on Hover */}
              {hoveredCard === index && (
                <div className="absolute inset-0 z-0 opacity-20">
                  <img
                    src="/headphone-3d.png"
                    alt="3D Visualization"
                    className="w-full h-full object-cover rounded-2xl"
                  />
                </div>
              )}

              {/* Content */}
              <div className="relative z-10">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${feature.iconBg} rounded-lg flex items-center justify-center mb-4 sm:mb-6`}>
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>

                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-journova">{feature.title}</h3>

                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  {feature.features.map((item, idx) => (
                    <div key={idx} className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                      <span className="text-journova-muted text-xs sm:text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 sm:mt-12">
          <Button
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-lg"
            onClick={handleGetStarted}
          >
            Get Started Now →
          </Button>
        </div>
      </div>
    </section>
  )
}
