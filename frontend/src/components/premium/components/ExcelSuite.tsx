import React from 'react';
import ToolCard from './ToolCard';
import { BarChart3, Calculator, Brain,  FileDown, TrendingUp } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';

interface ExcelSuiteProps {
  isDarkMode?: boolean;
}

const ExcelSuite: React.FC<ExcelSuiteProps> = () => {
  const outletContext = useOutletContext<{ isDarkMode?: boolean }>() || {};
  const isDarkMode = outletContext.isDarkMode ?? false;
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full items-start justify-start animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`rounded-xl p-6 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-200 border-gray-100'} h-40`}></div>
        ))}
      </div>
    );
  }

  const tools = [
    {
        title: 'Chart Builder',
        description: 'Create stunning, publication-quality charts from your data.',
        icon: BarChart3,
        path: 'chartbuilder',
        pro: true,
        gradient: 'bg-gradient-to-r from-teal-400 to-cyan-500'
    },
   
    {
        title: 'AI Sheet Summarizer',
        description: 'Get key insights and summaries from your spreadsheets instantly.',
        icon: Brain,
        path: 'aisheet',
        pro: false,
        gradient: 'bg-gradient-to-r from-purple-500 to-pink-500'
    },
    
    {
        title: 'Export Wizard',
        description: 'Export your data to various formats like Excel, CSV, and JSON.',
        icon: FileDown,
        path: 'exportwizard',
        pro: false,
        gradient: 'bg-gradient-to-r from-green-500 to-teal-500'
    }
];

  const handleToolClick = (route: string) => {
    if (route) {
      navigate(`/premium/excel/${route}`);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="mb-12"> {/* Increased margin-bottom for a larger, consistent gap */}
        <h1 className={`text-3xl font-bold mb-2 ${
          isDarkMode ? 'text-gray-100' : 'text-white'
        }`}>Excel Genius Suite</h1>
        <p className={`${
          isDarkMode ? 'text-gray-400' : 'text-white'
        }`}>Smart tools for Excel automation and analysis</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full items-start justify-start">
        {tools.map((tool) => (
         <ToolCard
  key={tool.title}
  title={tool.title}
  description={tool.description}
  gradient={tool.gradient}
  isDarkMode={true}
  onClick={() => handleToolClick(tool.path)}
  className="h-44"
  icon={tool.icon} 
/>
        ))}
      </div>
    </div>
  );
};

export default ExcelSuite;