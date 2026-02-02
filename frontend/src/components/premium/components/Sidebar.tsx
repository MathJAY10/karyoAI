import React from 'react';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  FileText, 
  MessageSquare, 
  FileCheck, 
  Settings as SettingsIcon
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/premium' },
  { id: 'excel', label: 'Excel Genius Suite', icon: FileSpreadsheet, path: '/premium/excel' },
  { id: 'pdf', label: 'PDF Intelligence Hub', icon: FileText, path: '/premium/pdfhub' },
  { id: 'ai-chat', label: 'AI Workmate', icon: MessageSquare, path: '/premium/aiworkmate' },
  { id: 'smartdocs', label: 'SmartDocs Generator', icon: FileCheck, path: '/premium/smartdocs' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, path: '/premium/settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed left-0 top-20 w-64 backdrop-blur-xl border-r h-[calc(100vh-5rem)] overflow-y-auto z-40 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 ${
        isDarkMode 
          ? 'bg-gray-900/95 border-r border-gray-700/50' 
          : 'bg-white/95 border-r border-gray-200/50'
      }`}>
        <div className="p-6">
          <nav className="space-y-2">
            {sidebarItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/premium' && location.pathname.startsWith(item.path));
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-300 group ${
                    isActive
                      ? isDarkMode 
                        ? 'bg-gray-700 text-white shadow-lg shadow-gray-700/20' 
                        : 'bg-gray-900 text-white'
                      : isDarkMode
                        ? 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
