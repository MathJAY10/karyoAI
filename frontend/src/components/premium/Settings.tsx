import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@/lib/api';

const Settings: React.FC = () => {
  const { token } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<{
    startDate: string;
    expiryDate: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    async function fetchUser() {
      if (!token) return;
      try {
        const res = await axios.get(`${API_BASE}/user/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = res.data.user;
        setSubscription({
          startDate: user.subscriptionStart ? user.subscriptionStart.slice(0, 10) : '-',
          expiryDate: user.expiry ? user.expiry.slice(0, 10) : '-',
          amount: user.plan === 'Paid' ? 5666 : 0, // Replace with real amount if available
        });
      } catch (e: any) {
        setSubscription(null);
      }
    }
    fetchUser();
  }, [token]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      setMessage('Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-4 flex flex-col justify-center min-h-[calc(100vh-120px)]">
      <div className="bg-gradient-to-br from-[#18192a] via-[#23243a] to-[#23243a] rounded-2xl shadow-2xl p-12 border border-purple-500/20 backdrop-blur-md">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Account Settings</h2>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-purple-400 mb-2">Subscription Details</h3>
          <div className="flex flex-col gap-2 text-gray-300">
            <div className="flex justify-between">
              <span>Start Date:</span>
              <span className="font-medium">{subscription?.startDate || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>Expiry Date:</span>
              <span className="font-medium">{subscription?.expiryDate || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">₹{subscription?.amount ?? '-'}</span>
            </div>
          </div>
        </div>
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-purple-400 mb-2">Change Password</h3>
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
            <input
              type={showPassword ? 'text' : 'password'}
              className="bg-gray-800/80 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              placeholder="Old Password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              required
            />
            <input
              type={showPassword ? 'text' : 'password'}
              className="bg-gray-800/80 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              placeholder="New Password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            <input
              type={showPassword ? 'text' : 'password'}
              className="bg-gray-800/80 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
                className="accent-purple-500"
              />
              <label htmlFor="showPassword" className="text-gray-400 text-sm">Show Passwords</label>
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 text-white font-semibold py-2 rounded-lg shadow-md hover:opacity-90 transition disabled:opacity-60"
              disabled={loading || newPassword !== confirmPassword}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
            {message && <div className="text-green-400 text-center text-sm mt-2">{message}</div>}
            {error && <div className="text-red-400 text-center text-sm mt-2">{error}</div>}
            {newPassword !== confirmPassword && <div className="text-red-400 text-center text-sm">Passwords do not match</div>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings; 