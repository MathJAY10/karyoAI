import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { usePremiumNavigation } from '../../../hooks/usePremiumNavigation';
import { useTheme } from '../../../hooks/useTheme';

interface PremiumPageLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  isDarkMode?: boolean;
}

const PremiumPageLayout: React.FC<PremiumPageLayoutProps> = ({
  children,

  isDarkMode: initialTheme = true,
}) => {
  const {  } = usePremiumNavigation();
  const { isDarkMode, toggleTheme } = useTheme(initialTheme);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [, setSearchQuery] = useState('');

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const handleSearch = (query: string) => setSearchQuery(query);


  return (
    <div
      className={`min-h-screen w-full overflow-x-hidden transition-all duration-300 transition-colors ${
        isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
      }`}
    >
      {/* Fixed Header */}
      <Header
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        onMenuToggle={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onSearch={handleSearch}
      />

      {/* Fixed Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        isDarkMode={isDarkMode}
      />

      {/* Main Content Wrapper */}
      <div className="pt-20 lg:pl-64 pl-4 pr-4 pb-10 min-h-screen">
        <div className="w-full flex flex-col flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PremiumPageLayout;
