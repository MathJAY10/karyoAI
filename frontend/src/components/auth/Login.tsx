import React, { useState } from "react";
import { userLogin } from "../../lib/api";
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();


  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const usernameOrEmail = (form.username as any).value;
    const password = (form.password as any).value;
    try {
      const payload = usernameOrEmail.includes("@")
        ? { email: usernameOrEmail, password }
        : { username: usernameOrEmail, password };
      const data = await userLogin(payload);
      login(data.user, data.accessToken);
      setLoading(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a12] px-4">
      <div className="w-full max-w-md bg-[#18192a] rounded-2xl shadow-xl p-8 relative">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Sign In to Your Account</h2>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-gray-300 mb-1" htmlFor="username">Username or Email</label>
            <input id="username" name="username" type="text" autoComplete="username" required className="w-full px-4 py-3 rounded-lg bg-[#23243a] text-white border border-[#23243a] focus:border-purple-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-gray-300 mb-1" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="w-full px-4 py-3 rounded-lg bg-[#23243a] text-white border border-[#23243a] focus:border-purple-500 focus:outline-none" />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 text-white font-semibold py-3 rounded-lg shadow-lg hover:opacity-90 transition">{loading ? "Signing In..." : "Sign In"}</button>
        </form>
        <div className="mt-6 text-center">
          <span className="text-gray-400">Don't have an account? </span>
          <a href="/signup" className="text-purple-400 hover:underline">Sign Up</a>
        </div>
      </div>
    </div>
  );
} 