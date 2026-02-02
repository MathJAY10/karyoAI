import React from 'react';
import ToolCard from './ToolCard';
import { FileCheck, FileText } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

interface SmartDocsProps {
  isDarkMode?: boolean;
}

const SmartDocs: React.FC<SmartDocsProps> = () => {
  const outletContext = useOutletContext<{ isDarkMode?: boolean }>() || {};
  const isDarkMode = outletContext.isDarkMode ?? false;
  const tools = [
    {
      title: 'Invoice Builder',
      description: 'Create professional invoices automatically',
      icon: FileCheck,
      gradient: 'bg-gradient-to-r from-pink-500 to-rose-500',
    },
    {
      title: 'Offer Letter Composer',
      description: 'Generate professional offer letters',
      icon: FileText,
      gradient: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    }
  ];

  return (
    <div className="space-y-6 w-full">
      <div className="mb-12"> {/* Increased margin-bottom for a larger, consistent gap */}
        <h1 className={`text-3xl font-bold mb-2 ${
          isDarkMode ? 'text-gray-100' : 'text-white'
        }`}>SmartDocs Generator</h1>
        <p className={`${
          isDarkMode ? 'text-gray-400' : 'text-white'
        }`}>Business document automation suite</p>
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
            onClick={() => {
              if (tool.title === 'Offer Letter Composer') {
                window.open('/smartdocs/offerletter', '_blank', 'noopener,noreferrer');
              } else if (tool.title === 'Invoice Builder') {
                window.open('/smartdocs/smartinvoice', '_blank', 'noopener,noreferrer');
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SmartDocs;