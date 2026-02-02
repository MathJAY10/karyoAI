import React from 'react';
import ToolCard from './ToolCard';
import { Send, Mail, BookOpen, TrendingUp } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';

interface BulkMailerProps {
  isDarkMode?: boolean;
}

const BulkMailer: React.FC<BulkMailerProps> = () => {
  const outletContext = useOutletContext<{ isDarkMode?: boolean }>() || {};
  const navigate = useNavigate();
  const isDarkMode = outletContext.isDarkMode ?? false;
  const tools = [
    {
      title: 'Excel-to-Email Engine',
      description: 'Send personalized emails from Excel data',
      icon: Send,
      gradient: 'bg-gradient-to-r from-red-500 to-pink-500',
      path: '/premium/bulkmailer/excel-engine'
    },
    {
      title: 'Mail Merge AI',
      description: 'Automate mail merge with AI',
      icon: Mail,
      gradient: 'bg-gradient-to-r from-purple-500 to-indigo-500',
      path: '/premium/bulkmailer/mailmergeai'
    },
    {
      title: 'Smart Templates Library',
      description: 'Access a library of smart email templates',
      icon: BookOpen,
      gradient: 'bg-gradient-to-r from-green-500 to-emerald-500',
      path:'/premium/bulkmailer/smarttemplates'
      
    },
    {
      title: 'Delivery & Bounce Tracker',
      description: 'Track email delivery and bounces',
      icon: TrendingUp,
      gradient: 'bg-gradient-to-r from-orange-500 to-red-500',
    },
  ];

  return (
    <div className="space-y-6 w-full">
      <div className="mb-12"> {/* Increased margin-bottom for a larger, consistent gap */}
        <h1 className={`text-3xl font-bold mb-2 ${
          isDarkMode ? 'text-gray-100' : 'text-white'
        }`}>BulkMailer Pro</h1>
        <p className={`${
          isDarkMode ? 'text-gray-400' : 'text-white'
        }`}>Send personalized emails in seconds</p>
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
            onClick={() => tool.path ? navigate(tool.path) : console.log(`Opening ${tool.title}`)}
          />
        ))}
      </div>
    </div>
  );
};

export default BulkMailer;