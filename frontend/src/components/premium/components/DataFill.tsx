import React from 'react';
import ToolCard from './ToolCard';
import { Database, FileSpreadsheet, Table, Sparkles } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

interface DataFillProps {
  isDarkMode?: boolean;
}

const DataFill: React.FC<DataFillProps> = () => {
  const outletContext = useOutletContext<{ isDarkMode?: boolean }>() || {};
  const isDarkMode = outletContext.isDarkMode ?? false;
  const tools = [
    {
      title: 'Auto Form Filler',
      description: 'Automatically fill forms with Excel data',
      icon: Database,
      gradient: 'bg-gradient-to-r from-indigo-500 to-blue-500',
    },
    {
      title: 'Excel-to-Form Mapper',
      description: 'Map Excel columns to form fields',
      icon: FileSpreadsheet,
      gradient: 'bg-gradient-to-r from-green-500 to-emerald-500',
    },
    {
      title: 'Structured Data Extractor',
      description: 'Extract and structure data from documents',
      icon: Table,
      gradient: 'bg-gradient-to-r from-purple-500 to-pink-500',
    },
    {
      title: 'AI Data Cleanser',
      description: 'Clean and validate data automatically',
      icon: Sparkles,
      gradient: 'bg-gradient-to-r from-orange-500 to-red-500',
    },
  ];

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className={`text-3xl font-bold mb-2 ${
          isDarkMode ? 'text-gray-100' : 'text-white'
        }`}>DataFill AI</h1>
        <p className={`${
          isDarkMode ? 'text-gray-400' : 'text-white'
        }`}>Data entry automation and form processing</p>
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
            onClick={() => console.log(`Opening ${tool.title}`)}
          />
        ))}
      </div>
    </div>
  );
};

export default DataFill;