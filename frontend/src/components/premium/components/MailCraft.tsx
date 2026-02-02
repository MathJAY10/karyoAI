import React from 'react';
import ToolCard from './ToolCard';
import { Mail, Type, Edit3 } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';

interface MailCraftProps {
  isDarkMode?: boolean;
}

const MailCraft: React.FC<MailCraftProps> = () => {
  const outletContext = useOutletContext<{ isDarkMode?: boolean }>() || {};
  const isDarkMode = outletContext.isDarkMode ?? false;
  const navigate = useNavigate();
  const tools = [
    {
      title: 'Email Wizard',
      description: 'Create cold, sales, and HR emails instantly',
      icon: Mail,
      gradient: 'bg-gradient-to-r from-green-500 to-emerald-500',
      onClick: () => navigate('/premium/mailcraft/emailwizard'),
    },
    {
      title: 'Subject Line Optimizer',
      description: 'Generate high-converting email subject lines',
      icon: Type,
      gradient: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      onClick: () => navigate('/premium/mailcraft/subjectlineoptimizer'),
    },
    {
      title: 'Tone Polisher',
      description: 'Fix grammar and improve email tone',
      icon: Edit3,
      gradient: 'bg-gradient-to-r from-purple-500 to-pink-500',
      onClick: () => navigate('/premium/mailcraft/tonepolisher'),
    }
  ];

  return (
    <div className="space-y-6 w-full">
      <div className="mb-12"> {/* Increased margin-bottom for a larger, consistent gap */}
        <h1 className={`text-3xl font-bold mb-2 ${
          isDarkMode ? 'text-gray-100' : 'text-white'
        }`}>MailCraft AI</h1>
        <p className={`${
          isDarkMode ? 'text-gray-400' : 'text-white'
        }`}>Email automation tools for crafting perfect emails</p>
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
            onClick={tool.onClick || (() => {})}
          />
        ))}
      </div>
    </div>
  );
};

export default MailCraft;