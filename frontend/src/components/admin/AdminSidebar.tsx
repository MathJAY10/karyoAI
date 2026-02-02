import React from 'react';
import { Users, UserCheck, UserX, Settings as SettingsIcon } from 'lucide-react';

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

const sidebarItems = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'paid-users', label: 'Paid Users', icon: UserCheck },
  { id: 'unpaid-users', label: 'Unpaid Users', icon: UserX },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeSection, onSectionChange, isOpen, onClose, isDarkMode }) => {
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
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSectionChange(item.id);
                  onClose();
                }}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-300 group ${
                  activeSection === item.id
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
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar; 