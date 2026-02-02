import React, { useState } from 'react';
import {  User, Search, Menu, X, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminHeaderProps {
  onMenuToggle: () => void;
  isSidebarOpen: boolean;
  onSearch: (query: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onMenuToggle, isSidebarOpen, onSearch, isDarkMode, toggleTheme }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setShowDropdown(false);
    navigate('/');
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl transition-all duration-300 h-20 mb-6 ${
      isDarkMode 
        ? 'bg-gray-900/95 border-b border-gray-700/50' 
        : 'bg-white/95 border-b border-gray-200/50'
    }`}>
      <div className="flex items-center justify-between px-4 lg:px-8 h-20">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuToggle}
          className={`lg:hidden p-2 rounded-lg transition-all duration-200 ${
            isDarkMode 
              ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Logo Section */}
        <div className="flex items-center space-x-3 lg:ml-0 ml-2 flex-shrink-0 min-w-0">
          <div className="relative flex items-center h-20">
            <img src="/karyo-logo.png" alt="Karyo AI" className={`h-32 w-auto rounded-lg transition-all duration-300 ${
              isDarkMode ? 'filter brightness-0 invert' : 'filter brightness-0'
            }`} />
          </div>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-4 lg:mx-8">
          <div className="relative w-full">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-400'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search users, settings..."
              className={`w-full rounded-lg pl-11 pr-4 py-3 placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-purple-500' 
                  : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-gray-900'
              }`}
            />
          </div>
        </div>

        {/* Welcome Message */}
       

        {/* Right Side Controls */}
        <div className="flex items-center space-x-2 lg:space-x-3 ml-2 lg:ml-6">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className={`p-2.5 rounded-lg transition-all duration-200 ${
              isDarkMode 
                ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {/* Settings */}
          
          {/* User Profile */}
          <div className={`flex items-center space-x-2 lg:space-x-3 ml-2 lg:ml-4 pl-2 lg:pl-4 border-l ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="relative">
              <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center focus:outline-none ${
                  isDarkMode ? 'bg-purple-600' : 'bg-gray-900'
                }`}
                onClick={() => setShowDropdown((v) => !v)}
                title="Admin menu"
              >
                <User className="w-4 h-4 text-white" />
              </button>
              {showDropdown && (
                <div className={`absolute right-0 mt-2 w-32 rounded-lg shadow-lg z-50 ${
                  isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}>
                  <button
                    className={`block w-full text-left px-4 py-2 text-sm rounded-lg transition-colors duration-200 font-semibold ${
                      isDarkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'
                    }`}
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader; 