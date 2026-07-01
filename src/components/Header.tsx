import React, { useState } from 'react';
import { User as UserType } from '../types';
import { Search, ShoppingBag, User as UserIcon, Sun, Moon, Menu, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  user: UserType | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  cartCount: number;
  onOpenCart: () => void;
  activeView: string;
  onChangeView: (view: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Header({
  user,
  onOpenAuth,
  onLogout,
  cartCount,
  onOpenCart,
  activeView,
  onChangeView,
  darkMode,
  onToggleDarkMode,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navigationItems = [
    { label: 'Shop', view: 'shop' },
    { label: 'Brand Story', view: 'story' },
    { label: 'Contact Support', view: 'contact' },
    { label: 'Privacy Policy', view: 'privacy' },
  ];

  return (
    <nav className="w-full sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-40 transition-colors duration-300">
      <div className="flex justify-between items-center w-full px-5 md:px-16 py-4.5 max-w-[1440px] mx-auto">
        {/* Brand Logo with a Bento Accent Block */}
        <button
          onClick={() => onChangeView('shop')}
          className="flex items-center gap-3 group text-left"
        >
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-display-lg font-bold text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
            EE
          </div>
          <h1 className="font-display text-xl font-extrabold tracking-tight uppercase text-slate-900 dark:text-slate-100">
            Ethos<span className="text-indigo-600 dark:text-indigo-400 font-medium">Editorial</span>
          </h1>
        </button>

        {/* Navigation Links - Desktop */}
        <div className="hidden md:flex items-center space-x-12">
          {navigationItems.map((item) => (
            <button
              key={item.view}
              onClick={() => {
                onChangeView(item.view);
                setMenuOpen(false);
              }}
              className={`text-[11px] font-bold uppercase tracking-widest transition-colors duration-200 hover:text-indigo-600 dark:hover:text-indigo-400 ${
                activeView === item.view
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 pb-1'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
          {user && (
            <button
              onClick={() => onChangeView('dashboard')}
              className={`text-[11px] font-bold uppercase tracking-widest transition-colors duration-200 flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 ${
                activeView === 'dashboard'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 pb-1'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <LayoutDashboard size={14} />
              Dashboard
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-5 text-slate-800 dark:text-slate-200">
          {/* WebSocket Connected Badge embedded directly in the Header */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] text-emerald-500 dark:text-emerald-400 font-mono uppercase tracking-wider">WebSocket: Live</span>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="hover:opacity-75 transition-opacity p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80"
            id="theme-toggle"
          >
            {darkMode ? <Sun size={17} className="text-amber-500" /> : <Moon size={17} className="text-indigo-400" />}
          </button>

          {/* Cart Icon */}
          <button
            onClick={onOpenCart}
            className="relative hover:opacity-75 transition-opacity p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80"
            id="shopping-cart-button"
            title="Open Bag"
          >
            <ShoppingBag size={17} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md shadow-indigo-500/30 animate-pulse">
                {cartCount}
              </span>
            )}
          </button>

          {/* User Section */}
          <div className="relative">
            {user ? (
              <div>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 text-xs font-semibold uppercase tracking-wider hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                  id="profile-dropdown-button"
                >
                  <UserIcon size={17} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden md:inline font-bold pr-1 text-slate-800 dark:text-slate-200">
                    {user.name.split(' ')[0]}
                  </span>
                </button>
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-56 p-2 rounded-2xl shadow-xl z-50 text-left">
                    <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                      {user.role === 'admin' && (
                        <span className="mt-1.5 inline-flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          <ShieldCheck size={10} /> Curator/Admin
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        onChangeView('dashboard');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wider rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <LayoutDashboard size={14} className="text-indigo-500" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        onLogout();
                        setProfileDropdownOpen(false);
                        onChangeView('shop');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wider rounded-xl hover:bg-red-500/5 text-red-600 dark:text-red-400"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 p-2 px-3 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/15"
                id="login-button"
              >
                <UserIcon size={15} />
                <span className="hidden md:inline font-bold">Sign In</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Icon */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:opacity-70"
            id="mobile-menu-toggle"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-4 space-y-3 flex flex-col">
          {navigationItems.map((item) => (
            <button
              key={item.view}
              onClick={() => {
                onChangeView(item.view);
                setMenuOpen(false);
              }}
              className={`text-left text-xs uppercase tracking-widest py-1.5 font-bold ${
                activeView === item.view ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
          {user && (
            <button
              onClick={() => {
                onChangeView('dashboard');
                setMenuOpen(false);
              }}
              className={`text-left text-xs uppercase tracking-widest py-1.5 flex items-center gap-1.5 font-bold ${
                activeView === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <LayoutDashboard size={14} />
              Dashboard
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
