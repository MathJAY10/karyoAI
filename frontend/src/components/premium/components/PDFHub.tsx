import React from 'react';
import ToolCard from './ToolCard';
import { FileText, MessageSquare, Database, FileDown, FolderOpen } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';

interface PDFHubProps {
  isDarkMode?: boolean;
}

const PDFHub: React.FC<PDFHubProps> = () => {
  const outletContext = useOutletContext<{ isDarkMode?: boolean }>() || {};
  const isDarkMode = outletContext.isDarkMode ?? false;
  const navigate = useNavigate();
  const tools = [
    {
      title: 'PDF Brain',
      description: 'Intelligent PDF summarization and analysis',
      icon: FileText,
      gradient: 'bg-gradient-to-r from-purple-500 to-indigo-500',
      onClick: () => navigate('/premium/pdfhub/brain'),
    },
    {
      title: 'PDF Chat Agent',
      description: 'Ask questions about your PDF documents',
      icon: MessageSquare,
      gradient: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      onClick: () => navigate('/premium/pdfhub/chatagent'),
    },
    
    {
      title: 'PDF Converter Pro',
      description: 'Convert PDFs to Word, Excel, and more',
      icon: FileDown,
      gradient: 'bg-gradient-to-r from-orange-500 to-red-500',
        onClick: () => navigate('/premium/pdfhub/converterpro'),
    },
   
  ];

  return (
    <div className="space-y-6 w-full">
      <div className="mb-12"> {/* Increased margin-bottom for a larger, consistent gap */}
        <h1 className={`text-3xl font-bold mb-2 ${
          isDarkMode ? 'text-gray-100' : 'text-white'
        }`}>PDF Intelligence Hub</h1>
        <p className={`${
          isDarkMode ? 'text-gray-400' : 'text-white'
        }`}>Automate and chat with your documents</p>
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
            onClick={tool.onClick || (() => console.log(`Opening ${tool.title}`))}
          />
        ))}
      </div>
    </div>
  );
};

export default PDFHub;