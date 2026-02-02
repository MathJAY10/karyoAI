import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FileSpreadsheet, FileText, MessageSquare, FileCheck } from 'lucide-react';

interface DashboardProps {
  searchQuery?: string;
  isDarkMode?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ searchQuery = '' }) => {
  const { isDarkMode } = useOutletContext<{ isDarkMode: boolean }>();
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 w-full items-start justify-start animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`rounded-xl p-4 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-200 border-gray-100'} h-48`}></div>
        ))}
      </div>
    );
  }

  const handleSuiteClick = (suiteTitle: string) => {
    switch (suiteTitle) {
      case 'Excel Genius Suite':
        navigate('/premium/excel');
        break;
      case 'PDF Intelligence Hub':
        navigate('/premium/pdfhub');
        break;
      case 'AI Workmate':
        navigate('/premium/aiworkmate');
        break;
      case 'SmartDocs Generator':
        navigate('/premium/smartdocs');
        break;
      default:
        console.log(`Suite ${suiteTitle} clicked`);
    }
  };

  const toolSuites = [
    {
      title: 'Excel Genius Suite',
      description: 'Smart tools for Excel automation',
      icon: FileSpreadsheet,
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      shadowColor: 'shadow-teal-500/20',
      hoverShadow: 'hover:shadow-teal-500/40',
      tools: [
        'Chart Builder Pro',
        'AI Sheet Summarizer', 
        'Formula Master (Write + Explain)',
        'Error & Trend Detector',
        'Excel Export Wizard'
      ]
    },
    {
      title: 'PDF Intelligence Hub',
      description: 'Automate and chat with documents',
      icon: FileText,
      gradient: 'from-purple-500 via-violet-500 to-indigo-500',
      shadowColor: 'shadow-purple-500/20',
      hoverShadow: 'hover:shadow-purple-500/40',
      tools: [
        'PDF Brain (Summarizer)',
        'PDF Chat Agent (Ask your PDF)',
        'Smart Data Extractor',
        'PDF Converter Pro (Word/Excel)',
        'Bulk PDF Toolkit'
      ]
    },
    {
      title: 'AI Workmate',
      description: 'Premium Chat Assistant - Your smart virtual AI agent',
      icon: MessageSquare,
      gradient: 'from-orange-500 via-red-500 to-pink-500',
      shadowColor: 'shadow-orange-500/20',
      hoverShadow: 'hover:shadow-orange-500/40',
      tools: [
        'AI Agent (ChatGPT-4 Level)',
        'Smart Email Drafter',
        'Resume Evaluator & Enhancer',
        'Product Description Pro',
        'Marketing Copy Generator'
      ]
    },


    {
      title: 'SmartDocs Generator',
      description: 'Business document automation suite',
      icon: FileCheck,
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      shadowColor: 'shadow-pink-500/20',
      hoverShadow: 'hover:shadow-pink-500/40',
      tools: [
        'Invoice Builder',
        'Offer Letter Composer'
        
      ]
    },


  ];

  // Filter tool suites based on search query
  const filteredToolSuites = toolSuites.filter(suite => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const titleMatch = suite.title.toLowerCase().includes(query);
    const descriptionMatch = suite.description.toLowerCase().includes(query);
    const toolsMatch = suite.tools.some(tool => tool.toLowerCase().includes(query));
    
    return titleMatch || descriptionMatch || toolsMatch;
  });

  return (
    <div className="space-y-8">
      {/* Usage Limits Section */}
     
      {/* Search Results Info */}
      {searchQuery && (
        <div className="text-center">
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {filteredToolSuites.length > 0 
              ? `Found ${filteredToolSuites.length} tool suite${filteredToolSuites.length !== 1 ? 's' : ''} matching "${searchQuery}"`
              : `No results found for "${searchQuery}"`}
          </p>
        </div>
      )}

      {/* Tool Suites Grid */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 items-stretch"> {/* Adjusted grid for 4 items */}
        {filteredToolSuites.map((suite) => (
          <div 
            key={suite.title}
            className={`group relative rounded-xl p-5 sm:p-6 border transition-all duration-300 cursor-pointer h-full min-h-[260px] sm:min-h-[280px] flex flex-col ${
              isDarkMode 
                ? 'bg-gray-900 border-gray-700 hover:border-gray-600 hover:shadow-lg hover:shadow-purple-500/5 hover:scale-[1.015] hover:bg-gray-900/90 text-white' 
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg hover:scale-[1.015] text-gray-900'
            }`}
            onClick={() => handleSuiteClick(suite.title)}
          >
            {/* Suite Header */}
            <div className="relative z-10 mb-5">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center mb-2 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <suite.icon className={`w-5 h-5 sm:w-5 sm:h-5 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`} />
              </div>
              <h3 className={`font-semibold text-base sm:text-lg mb-1 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {suite.title}
              </h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {suite.description}
              </p>
            </div>

            {/* Tools List */}
            <div className="relative z-10 space-y-2 mb-4 flex-1">
              {suite.tools.map((tool, toolIndex) => (
                <div 
                  key={toolIndex}
                  className={`flex items-center space-x-2 py-0.5 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  <div className={`w-1 h-1 rounded-full flex-shrink-0 ${
                    isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-xs sm:text-sm font-medium">
                    {tool}
                  </span>
                </div>
              ))}
            </div>

            {/* Action Button */}
            <div className={`relative z-10 pt-2 border-t mt-auto ${
              isDarkMode ? 'border-gray-700' : 'border-gray-100'
            }`}>
              <button className={`w-full py-2 px-4 rounded-lg font-medium text-xs sm:text-xs transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}>
                Open Tools
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
  
  export default Dashboard;