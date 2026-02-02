import React, { useState } from "react";
import { userSignup } from "../../lib/api";
import { useAuth } from '../../context/AuthContext';

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();


  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const username = (form.username as any).value;
    const email = (form.email as any).value;
    const password = (form.password as any).value;
    const confirmPassword = (form.confirmPassword as any).value;
    try {
      const data = await userSignup({ username, email, password, confirmPassword });
      if (data && data.user && data.accessToken) {
        login(data.user, data.accessToken);
      }
      setLoading(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Signup failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a12] px-2">
      <div className="w-full max-w-md bg-[#18192a] rounded-2xl shadow-xl p-4 md:p-6 relative">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Create Your Account</h2>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="block text-gray-300 mb-1" htmlFor="username">Username</label>
            <input id="username" name="username" type="text" autoComplete="username" required className="w-full px-3 py-2 rounded-lg bg-[#23243a] text-white border border-[#23243a] focus:border-purple-500 focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-gray-300 mb-1" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="w-full px-3 py-2 rounded-lg bg-[#23243a] text-white border border-[#23243a] focus:border-purple-500 focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-gray-300 mb-1" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required className="w-full px-3 py-2 rounded-lg bg-[#23243a] text-white border border-[#23243a] focus:border-purple-500 focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-gray-300 mb-1" htmlFor="confirmPassword">Confirm Password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required className="w-full px-3 py-2 rounded-lg bg-[#23243a] text-white border border-[#23243a] focus:border-purple-500 focus:outline-none text-sm" />
          </div>
          {error && <div className="text-red-500 text-xs">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 text-white font-semibold py-2 rounded-lg shadow-lg hover:opacity-90 transition text-sm">{loading ? "Creating Account..." : "Create Account"}</button>
        </form>
        <div className="mt-4 text-center">
          <span className="text-gray-400 text-xs">Already have an account? </span>
          <a href="/login" className="text-purple-400 hover:underline text-xs">Sign In</a>
        </div>
      </div>
    </div>
  );
} 