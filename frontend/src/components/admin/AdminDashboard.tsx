import React, { useState } from 'react';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import UsersSection from './UsersSection';
import { updateAdminPassword } from '../../lib/api';

function AdminDashboard() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeSection, setActiveSection] = useState('users');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [, setSearchQuery] = useState('');

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const handleSearch = (query: string) => setSearchQuery(query);

  const renderContent = () => {
    switch (activeSection) {
      case 'users': return <UsersSection isDarkMode={isDarkMode} />;
      case 'paid-users': return <UsersSection isDarkMode={isDarkMode} filter="Paid" />;
      case 'unpaid-users': return <UsersSection isDarkMode={isDarkMode} filter="Free" />;
      case 'settings':
        return <AdminSettings isDarkMode={isDarkMode} />;
      default: return <UsersSection isDarkMode={isDarkMode} />;
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-300 transition-colors duration-500 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <AdminHeader 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme}
        onMenuToggle={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onSearch={handleSearch}
      />
      <div className="flex flex-col md:flex-row">
        <AdminSidebar 
          activeSection={activeSection} 
          onSectionChange={(section) => { setActiveSection(section); setIsSidebarOpen(false); }}
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          isDarkMode={isDarkMode}
        />
        <main className={`flex-1 p-6 lg:p-8 pt-32 lg:pt-36 md:ml-64 overflow-y-auto min-h-screen transition-all duration-300 transition-colors duration-500 ${
          isDarkMode ? 'text-gray-100' : 'text-gray-900'
        }`}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

const AdminSettings: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!current || !next || !confirm) {
      setError('All fields are required.');
      return;
    }
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || '';
      await updateAdminPassword(current, next, token);
      setSuccess(true);
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 rounded-xl border shadow-lg transition-all duration-300 space-y-6 "
      style={{
        background: isDarkMode ? '#18181b' : '#fff',
        borderColor: isDarkMode ? '#27272a' : '#e5e7eb',
        color: isDarkMode ? '#f4f4f5' : '#18181b',
      }}>
      <h2 className="text-2xl font-bold mb-4">Update Admin Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 text-sm font-medium">Current Password</label>
          <input
            type="password"
            value={current}
            onChange={e => setCurrent(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
            placeholder="Enter current password"
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium">New Password</label>
          <input
            type="password"
            value={next}
            onChange={e => setNext(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
            placeholder="Enter new password"
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium">Confirm New Password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
            placeholder="Confirm new password"
            required
          />
        </div>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        {success && <div className="text-green-500 text-sm">Password updated successfully!</div>}
        <button
          type="submit"
          className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${isDarkMode ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
};

export default AdminDashboard; 