import React from 'react';
import ToolCard from './ToolCard';
import { Share2, Hash, Megaphone, Edit3 } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';

interface SocialProProps {
  isDarkMode?: boolean;
}

const SocialPro: React.FC<SocialProProps> = () => {
  const outletContext = useOutletContext<{ isDarkMode?: boolean }>() || {};
  const isDarkMode = outletContext.isDarkMode ?? false;
  const navigate = useNavigate();
  
  const tools = [
    {
      title: 'LinkedIn/Insta Caption Pro',
      description: 'Create engaging social media captions',
      icon: Share2,
      gradient: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      path: '/premium/socialpro/captionpro'
    },
    {
      title: 'Hashtag Strategist',
      description: 'Generate trending and relevant hashtags',
      icon: Hash,
      gradient: 'bg-gradient-to-r from-blue-500 to-purple-500',
      path: '/premium/socialpro/hashtagstrategist'
    },
    {
      title: 'Ad Caption Generator',
      description: 'Create compelling ad copy for campaigns',
      icon: Megaphone,
      gradient: 'bg-gradient-to-r from-green-500 to-teal-500',
      path: '/premium/socialpro/adcaption'
    },
    {
      title: 'Caption Rewriter AI',
      description: 'Rewrite and improve existing captions',
      icon: Edit3,
      gradient: 'bg-gradient-to-r from-blue-500 to-purple-500',
      path: '/premium/socialpro/captionrewriter'
    },
  ];

  const handleToolClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className={`text-3xl font-bold mb-2 ${
          isDarkMode ? 'text-gray-100' : 'text-white'
        }`}>Social Pro Toolkit</h1>
        <p className={`${
          isDarkMode ? 'text-gray-400' : 'text-white'
        }`}>AI tools for content creators and marketers</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full items-start justify-start">
        {tools.map((tool) => (
          <ToolCard
            key={tool.title}
            title={tool.title}
            description={tool.description}
            icon={tool.icon}
            gradient={tool.gradient}
            isDarkMode={isDarkMode}
            onClick={() => handleToolClick(tool.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default SocialPro;