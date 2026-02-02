"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Menu, X } from "lucide-react"
import { useAuth } from '../../context/AuthContext';
import { fetchCurrentUser } from '../../lib/api';
import { UserCircle, ChevronDown } from 'lucide-react';
import { useRef } from "react";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, isAuthenticated, logout, token, login } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Fetch latest user info on mount if authenticated
  useEffect(() => {
    async function fetchUser() {
      if (isAuthenticated && token) {
        try {
          const data = await fetchCurrentUser(token);
          if (data && data.user) {
            login(data.user, token); // update context with latest user
          }
        } catch (e) {
          // If token invalid, logout
          logout();
        }
      }
    }
    fetchUser();
    // eslint-disable-next-line
  }, [isAuthenticated, token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleProfileDropdown = () => setDropdownOpen((open) => !open);

  const navItems = [
    { name: "FEATURES", href: "#interactive-feature-cards" },
    { name: "PRICING", href: "#hero-section" },
    { name: "HOW TO USE", href: "#how-it-works" },
  ]

  return (
    <>
      {/* Fixed Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-20 ${
          isScrolled
            ? "bg-gray-900/80 backdrop-blur-md border-b border-gray-800/50"
            : "bg-gray-900/60 backdrop-blur-sm border-b border-gray-800/30"
        }`}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 h-full">
          {/* Logo - Fixed positioning to stay left-aligned */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <img 
              src="/karyo-logo.png" 
              alt="Karyo AI" 
              className="h-20 sm:h-20 md:h-24 lg:h-28 w-auto"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-white font-medium text-sm tracking-wide hover:text-gray-300 transition-colors duration-200"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
            {isAuthenticated && user ? (
              <div className="relative flex items-center gap-2">
                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white focus:outline-none"
                  onClick={handleProfileDropdown}
                  aria-haspopup="true"
                  aria-label="Profile menu"
                >
                  <UserCircle className="w-6 h-6" />
                  <span className="font-medium">{user.username?.split(' ')[0]}</span>
                  <ChevronDown className="w-4 h-4 cursor-pointer" onClick={handleProfileDropdown} tabIndex={0} role="button" aria-label="Toggle profile menu" />
                </button>
                {dropdownOpen && (
                  <div
                    ref={dropdownRef}
                    className="absolute right-0 top-full mt-2 w-72 bg-gradient-to-br from-[#18192a] via-[#23243a] to-[#23243a] rounded-2xl shadow-2xl py-4 z-50 border border-purple-500/40 flex flex-col gap-2 animate-fadeIn"
                    style={{ minWidth: 240 }}
                    role="menu"
                  >
                    <div className="absolute -top-2 right-10 w-4 h-4 bg-gradient-to-br from-[#18192a] via-[#23243a] to-[#23243a] rotate-45 border-l border-t border-purple-500/40" style={{ zIndex: 1 }} />
                    {/* User Info */}
                    <div className="flex items-center gap-3 px-5 pb-3 border-b border-gray-700">
                      <div className="bg-gradient-to-br from-purple-400 to-cyan-400 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {user.username?.[0]?.toUpperCase() || <UserCircle className="w-7 h-7" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white text-base">{user.username}</span>
                        {user.email && <span className="text-xs text-gray-300">{user.email}</span>}
                      </div>
                    </div>
                    {/* Divider */}
                    <div className="my-1 border-t border-gray-700" />
                    {/* Logout Button */}
                    <button
                      className="block w-full text-left px-5 py-2 text-red-400 font-semibold hover:bg-gradient-to-r hover:from-purple-900/40 hover:to-cyan-900/40 rounded-xl transition-colors duration-150"
                      onClick={logout}
                      role="menuitem"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/signup" className="text-gray-400 text-sm font-medium tracking-wide hover:underline">NEW ACCOUNT</Link>
                {/* Fixed SIGN IN Button */}
                <Link to="/login" className="relative bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 p-[1px] rounded-lg hover:shadow-lg transition-all duration-200">
                  <div className="bg-gray-900 px-6 py-2 rounded-[7px] flex items-center justify-center">
                    <span className="text-white font-medium text-sm tracking-wide">SIGN IN</span>
                  </div>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden relative bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 p-[1px] rounded-lg flex-shrink-0"
          >
            <div className="bg-gray-900 p-2 sm:p-3 rounded-[7px] flex items-center justify-center">
              {isMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </div>
          </button>
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Background Overlay */}
          <div
            className="absolute inset-0 bg-gray-900/95 backdrop-blur-md"
            style={{
              background:
                "linear-gradient(180deg, #0f1419 0%, #1a1b2e 15%, #1e2139 30%, #252a4a 45%, #2d3561 60%, #3a4374 75%, #4a5490 90%, #5a6bb8 100%)",
            }}
          />

          {/* Menu Content */}
          <div className="relative z-50 flex flex-col items-center justify-center min-h-screen space-y-8 sm:space-y-12">
            {/* Navigation Items */}
            {navItems.map((item, index) => (
              <a
                key={item.name}
                href={item.href}
                className="text-white text-xl sm:text-2xl font-medium tracking-wide hover:text-gray-300 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  animationDelay: `${index * 0.1}s`,
                  animation: "fadeInUp 0.5s ease-out forwards",
                  opacity: 0,
                }}
              >
                {item.name}
              </a>
            ))}

            {/* Auth Items */}
            <Link
              to="/signup"
              className="text-white text-xl sm:text-2xl font-medium tracking-wide hover:text-gray-300 transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
              style={{
                animationDelay: "0.4s",
                animation: "fadeInUp 0.5s ease-out forwards",
                opacity: 0,
              }}
            >
              NEW ACCOUNT
            </Link>

            <Link
              to="/login"
              className="text-white text-xl sm:text-2xl font-medium tracking-wide hover:text-gray-300 transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
              style={{
                animationDelay: "0.5s",
                animation: "fadeInUp 0.5s ease-out forwards",
                opacity: 0,
              }}
            >
              SIGN IN
            </Link>
          </div>
        </div>
      )}

      {/* Spacer to prevent content from hiding behind fixed header */}
      <div className="h-20"></div>

      {/* No animated glow, just constant drop-shadow */}
    </>
  )
}