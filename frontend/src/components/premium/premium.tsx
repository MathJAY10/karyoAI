import Header from './components/Header';
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import { Outlet } from 'react-router-dom';

function PremiumDashboard() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [, setSearchQuery] = useState('');
  

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const handleSearch = (query: string) => setSearchQuery(query);

  return (
    <div className={`min-h-screen w-full overflow-x-hidden transition-all duration-300 transition-colors duration-500 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}> 
      <Header 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme}
        onMenuToggle={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onSearch={handleSearch}
      />
      <div className="flex w-full min-h-screen">
        {/* Sidebar handles its own fixed positioning and responsiveness */}
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          isDarkMode={isDarkMode}
        />
        {/* Main Content */}
        <main className={`flex-1 min-h-screen lg:pl-64 pl-0 pt-20 pb-8 transition-all duration-300 transition-colors duration-500 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} overflow-x-hidden overflow-y-auto`}>
          <div className="w-full max-w-full mx-auto px-4 flex-1 flex flex-col">
            <Outlet context={{ isDarkMode }} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default PremiumDashboard;