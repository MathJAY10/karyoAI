import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { adminLogin } from "../../lib/api";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const getErrorMessage = (err: any) => {
    if (!err) return '';
    if (typeof err === 'string') return err;
    if (typeof err === 'object') {
      if (err.message) return err.message;
      try {
        return JSON.stringify(err);
      } catch {
        return 'An error occurred.';
      }
    }
    return 'An error occurred.';
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const username = (form.username as any).value;
    const password = (form.password as any).value;
    try {
      const data = await adminLogin({ username, password });
      localStorage.setItem('adminToken', data.accessToken);
      setLoading(false);
      navigate('/admin');
    } catch (err: any) {
      setError(getErrorMessage(err?.response?.data?.error || err?.response?.data || err?.message || "Admin login failed"));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a12] px-4">
      <div className="w-full max-w-md bg-[#18192a] rounded-2xl shadow-xl p-8 relative">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Admin Login</h2>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-gray-300 mb-1" htmlFor="username">Username or Email</label>
            <input id="username" name="username" type="text" autoComplete="username" required className="w-full px-4 py-3 rounded-lg bg-[#23243a] text-white border border-[#23243a] focus:border-purple-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-gray-300 mb-1" htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required className="w-full px-4 py-3 rounded-lg bg-[#23243a] text-white border border-[#23243a] focus:border-purple-500 focus:outline-none pr-12" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPassword(v => !v)} tabIndex={-1} aria-label="Toggle password visibility">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {error && <div className="text-red-500 text-sm">{getErrorMessage(error)}</div>}
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 text-white font-semibold py-3 rounded-lg shadow-lg hover:opacity-90 transition">{loading ? "Signing In..." : "Sign In"}</button>
        </form>
      </div>
    </div>
  );
} 