import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, Mail, Lock, User as UserIcon, ShieldAlert } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (token: string, user: User) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listener for popup OAuth completion
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, user } = event.data;
        if (token && user) {
          onAuthSuccess(token, user);
          onClose();
        }
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onAuthSuccess, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
    const payload = isSignUp ? { name, email, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onAuthSuccess(data.token, data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: string) => {
    setError('');
    try {
      const res = await fetch(`/api/auth/oauth/url?provider=${provider}`);
      if (!res.ok) throw new Error('Failed to start OAuth flow');
      const { url } = await res.json();

      // Open OAuth provider in a popup window directly as required by OAuth skill
      const width = 500;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        url,
        'oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );

      if (!popup) {
        setError('Popup was blocked by your browser. Please allow popups.');
      }
    } catch (err: any) {
      setError(err.message || 'OAuth failure');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#f0f4f8] dark:bg-[#0f172a] text-[#1b1c1c] dark:text-white w-full max-w-md border border-[#eae8e7] dark:border-slate-800 relative p-8 shadow-2xl rounded-3xl">
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-[#747878] hover:text-[#1b1c1c] transition-colors"
          id="close-auth-modal"
        >
          <X size={20} />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <h2 className="font-display-lg text-2xl uppercase tracking-tighter">Cloths Shop</h2>
          <p className="text-[10px] uppercase tracking-widest text-[#747878] mt-1">
            {isSignUp ? 'Create your secure account' : 'Access your bespoke dashboard'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-[#ffdad6] text-[#93000a] text-xs flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}


        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Audrey Hepburn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-transparent px-4 py-3 text-sm outline-none focus:border-indigo-600 dark:focus:border-indigo-400 rounded-xl transition-colors"
                />
                <UserIcon size={16} className="absolute right-4 top-3.5 text-slate-400" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="audrey@editorial.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 bg-transparent px-4 py-3 text-sm outline-none focus:border-indigo-600 dark:focus:border-indigo-400 rounded-xl transition-colors"
              />
              <Mail size={16} className="absolute right-4 top-3.5 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 bg-transparent px-4 py-3 text-sm outline-none focus:border-indigo-600 dark:focus:border-indigo-400 rounded-xl transition-colors"
              />
              <Lock size={16} className="absolute right-4 top-3.5 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3.5 text-xs uppercase tracking-widest hover:bg-indigo-500 rounded-xl transition-colors font-bold mt-2 shadow-lg shadow-indigo-500/10"
          >
            {loading ? 'Authenticating...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {/* Third Party Logins / OAuth */}
        <div className="my-6 flex items-center justify-between text-xs text-slate-500 uppercase tracking-wider">
          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-grow"></div>
          <span className="px-3 text-[10px]">Or seamlessly sign in via</span>
          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-grow"></div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => handleOAuthLogin('Google')}
            className="border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 text-xs uppercase tracking-wider hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 hover:border-indigo-600 dark:hover:border-indigo-500 transition-all flex items-center justify-center gap-2"
            id="oauth-google"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.71 0 3.28.61 4.5 1.643l2.425-2.424C17.653 1.832 15.113 1 12.24 1 6.574 1 2 5.574 2 11.24s4.574 10.24 10.24 10.24c5.795 0 10.24-4.11 10.24-10.24 0-.623-.058-1.21-.166-1.755H12.24z"/>
            </svg>
            Google
          </button>
          <button
            onClick={() => handleOAuthLogin('GitHub')}
            className="border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 text-xs uppercase tracking-wider hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 hover:border-indigo-600 dark:hover:border-indigo-500 transition-all flex items-center justify-center gap-2"
            id="oauth-github"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            GitHub
          </button>
        </div>

        {/* Toggle Footer */}
        <div className="text-center text-xs text-[#747878]">
          <span>{isSignUp ? 'Already registered?' : 'New to Cloths Shop?'}</span>{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-slate-900 dark:text-slate-100 font-bold underline hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {isSignUp ? 'Sign In instead' : 'Create an account'}
          </button>
        </div>
      </div>
    </div>
  );
}
