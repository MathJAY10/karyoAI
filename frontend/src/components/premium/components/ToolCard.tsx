interface ToolCardProps {
  title: string;
  description: string;

  gradient: string;
  isDarkMode?: boolean;
  onClick: () => void;
  className?: string;
  icon: React.ElementType;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, description, icon: Icon, isDarkMode = false, onClick, className }) => {
  return (
    <div 
      onClick={onClick}
      className={`rounded-xl p-5 sm:p-6 border transition-all duration-300 cursor-pointer group ${
        isDarkMode 
          ? 'bg-gray-900 border-gray-700 hover:border-gray-600 hover:shadow-lg hover:shadow-purple-500/5 hover:scale-[1.02]' 
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg hover:scale-[1.02]'
      } min-h-[10rem] ${className || ''}`}
    >
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-3 sm:mb-4 ${
        isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
      }`}>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`} />
      </div>
      <h3 className={`font-semibold text-base sm:text-lg mb-1 sm:mb-2 ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>{title}</h3>
      <p className={`text-xs sm:text-sm ${
        isDarkMode ? 'text-gray-300' : 'text-gray-600'
      }`}>{description}</p>
    </div>
  );
};

export default ToolCard;