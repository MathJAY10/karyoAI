import React, { useState, useEffect } from 'react';
import { fetchAllUsers, resetUserLimits, toggleUserPlan, updateUserPlan } from '../../lib/api';

interface User {
  id: number;
  email: string;
  subscriptionStart: string;
  expiry: string;
  plan: 'Free' | 'Paid';
  active: boolean;
  messageLimit: number;
  emailLimit: number;
}


// Add API calls for toggling active and resetting limits

// Add a custom Switch component for plan toggle
const PlanSwitch: React.FC<{checked: boolean, onChange: () => void, disabled?: boolean}> = ({checked, onChange, disabled}) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none border-2 flex items-center px-1 ${
      checked ? 'bg-blue-500 border-blue-600' : 'bg-gray-300 border-gray-400'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    aria-pressed={checked ? true : false}
    aria-label="Toggle plan"
  >
    <span
      className={`inline-block w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-300 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

const UsersSection: React.FC<{ filter?: 'All' | 'Free' | 'Paid'; isDarkMode: boolean }> = ({ filter = 'All', isDarkMode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [planFilter, setPlanFilter] = useState<'All' | 'Free' | 'Paid'>(filter);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{id: number, to: 'Free' | 'Paid'}|null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);
  // TODO: Replace with real token from context or props
  const token = localStorage.getItem('adminToken') || '';

  useEffect(() => {
    setLoading(true);
    fetchAllUsers(token)
      .then(data => setUsers(data))
      .catch(() => setError('Failed to fetch users'))
      .finally(() => setLoading(false));
  }, [token]);


  const handleLimitChange = (id: number, field: 'messageLimit' | 'emailLimit', value: number) => {
    setUsers(users => users.map(u => u.id === id ? { ...u, [field]: value } : u));
  };


  const handleResetLimits = async (user: User) => {
    setUpdatingId(user.id);
    setError(null);
    try {
      const updated = await resetUserLimits(user.id, token);
      setUsers(users => users.map(u => u.id === user.id ? { ...u, ...updated } : u));
    } catch (e) {
      setError('Failed to reset user limits');
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePlanToggle = (user: User) => {
    setConfirmToggle({ id: user.id, to: user.plan === 'Free' ? 'Paid' : 'Free' });
  };
  const confirmPlanToggle = async () => {
    if (!confirmToggle) return;
    setUpdatingId(confirmToggle.id);
    setError(null);
    try {
      const updated = await toggleUserPlan(confirmToggle.id, token);
      setUsers(users => users.map(u => u.id === confirmToggle.id ? { ...u, ...updated } : u));
      setConfirmToggle(null);
    } catch (e) {
      setError('Failed to toggle user plan');
      console.error('Toggle plan error:', e);
    } finally {
      setUpdatingId(null);
    }
  };
  const cancelPlanToggle = () => setConfirmToggle(null);

  const handleSaveLimits = async (user: User) => {
    setSavingId(user.id);
    setError(null);
    setSuccessId(null);
    try {
      const updated = await updateUserPlan(user.id, user.plan, user.messageLimit, user.emailLimit, token);
      setUsers(users => users.map(u => u.id === user.id ? { ...u, ...updated } : u));
      setSuccessId(user.id);
      setTimeout(() => setSuccessId(null), 2000);
    } catch (e) {
      setError('Failed to update user limits');
    } finally {
      setSavingId(null);
    }
  };

  const filteredUsers = users.filter(u => planFilter === 'All' || u.plan === planFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-white'}`}>Users</h2>
        <div className="flex space-x-2">
          {['All', 'Paid', 'Free'].map(type => (
            <button
              key={type}
              onClick={() => setPlanFilter(type as 'All' | 'Free' | 'Paid')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                planFilter === type
                  ? isDarkMode ? 'bg-purple-600 text-white' : 'bg-gray-900 text-white'
                  : isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading users...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-700/40">
          <table className={`min-w-full text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}> 
            <thead>
              <tr className={isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Subscription Start</th>
                <th className="px-4 py-3 text-left font-semibold">Expiry</th>
                <th className="px-4 py-3 text-left font-semibold">Plan</th>
                <th className="px-4 py-3 text-left font-semibold">Active</th>
                <th className="px-4 py-3 text-left font-semibold">Message Limit</th>
                <th className="px-4 py-3 text-left font-semibold">Email Limit</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className={`min-w-full text-sm ${isDarkMode ? 'text-gray-200' : 'text-white'}`}> 
              {filteredUsers.map(user => (
                <tr key={user.id} className={isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'}>
                  <td className="px-4 py-3 whitespace-nowrap">{user.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{
                    new Date(user.subscriptionStart).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                  }</td>
                  <td className="px-4 py-3 whitespace-nowrap">{user.expiry}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      user.plan === 'Paid'
                        ? isDarkMode ? 'bg-green-700 text-green-200' : 'bg-green-100 text-green-800'
                        : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">{user.active ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 ">
                    <input
                      type="number"
                      value={user.messageLimit}
                      min={0}
                      placeholder="Msg limit"
                      title="Set message limit"
                      onChange={e => handleLimitChange(user.id, 'messageLimit', Number(e.target.value))}
                      className={`w-20 px-2 py-1 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={user.emailLimit}
                      min={0}
                      placeholder="Email limit"
                      title="Set email limit"
                      onChange={e => handleLimitChange(user.id, 'emailLimit', Number(e.target.value))}
                      className={`w-20 px-2 py-1 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    />
                  </td>
                  <td className="px-4 py-3 flex gap-2 items-center">
                    <PlanSwitch
                      checked={user.plan === 'Paid'}
                      onChange={() => handlePlanToggle(user)}
                      disabled={updatingId === user.id}
                    />
                    <span className={`text-xs font-semibold ml-2 ${user.plan === 'Paid' ? 'text-blue-600' : 'text-gray-500'}`}>{user.plan}</span>
                    <button
                      onClick={() => handleResetLimits(user)}
                      disabled={updatingId === user.id}
                      className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 border bg-teal-500 text-white border-teal-600 hover:bg-teal-600"
                    >
                      Reset Limits
                    </button>
                    <button
                      onClick={() => handleSaveLimits(user)}
                      disabled={savingId === user.id}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 border bg-blue-600 text-white border-blue-700 hover:bg-blue-700 ${savingId === user.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {savingId === user.id ? 'Saving...' : 'Save'}
                    </button>
                    {successId === user.id && <span className="text-green-400 ml-2">✓</span>}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border-2 border-blue-500">
            <h3 className="text-xl font-bold mb-4 text-blue-700 dark:text-blue-300">Confirm Plan Change</h3>
            <p className="mb-6 text-gray-700 dark:text-gray-200">Are you sure you want to switch this user to <span className="font-semibold text-blue-600 dark:text-blue-300">{confirmToggle.to}</span> plan?</p>
            <div className="flex justify-center gap-4">
              <button onClick={confirmPlanToggle} className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow">Yes, Confirm</button>
              <button onClick={cancelPlanToggle} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 shadow">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersSection; 