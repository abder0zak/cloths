import React, { useState } from 'react';
import { Mail, Check } from 'lucide-react';

interface FooterProps {
  onChangeView: (view: string) => void;
  onSubscribeNotification: (msg: string) => void;
}

export default function Footer({ onChangeView, onSubscribeNotification }: FooterProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubscribed(true);
    onSubscribeNotification(`Newsletter subscription active for ${email}. Early access granted.`);
    setEmail('');
  };

  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-850 mt-24 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-5 md:px-16 py-16 max-w-[1440px] mx-auto">
        
        {/* Brand Core Column */}
        <div className="space-y-6">
          <h2 className="font-display text-xl uppercase tracking-tight text-slate-900 dark:text-slate-100 font-black">
            Cloths Shop
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
            Curating the modern wardrobe with a focus on silhouette, sustainability, and quality craftsmanship.
          </p>
          <div className="flex space-x-6 text-xs uppercase tracking-widest font-extrabold">
            <a href="#instagram" className="text-indigo-600 dark:text-indigo-400 hover:underline transition-all">Instagram</a>
            <a href="#journal" className="text-indigo-600 dark:text-indigo-400 hover:underline transition-all">Journal</a>
          </div>
        </div>

        {/* Collections Links */}
        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold mb-6">Collections</h3>
          <ul className="space-y-3.5 text-xs">
            {['New Arrivals', 'Essentials', 'Archival', 'Silk Series'].map((link) => (
              <li key={link}>
                <button
                  onClick={() => onChangeView('shop')}
                  className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition-colors text-left"
                >
                  {link}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Information Links */}
        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold mb-6">Information</h3>
          <ul className="space-y-3.5 text-xs">
            <li>
              <button
                onClick={() => onChangeView('contact')}
                className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition-colors text-left"
              >
                Customer Care
              </button>
            </li>
            <li>
              <button
                onClick={() => onChangeView('story')}
                className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition-colors text-left"
              >
                Sustainability
              </button>
            </li>
            <li>
              <button
                onClick={() => onChangeView('privacy')}
                className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition-colors text-left"
              >
                Privacy Policy
              </button>
            </li>
            <li>
              <button
                onClick={() => onChangeView('contact')}
                className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition-colors text-left"
              >
                Newsletter
              </button>
            </li>
          </ul>
        </div>

        {/* Newsletter Subscription */}
        <div className="space-y-4">
          <h3 className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">Newsletter</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Join the editorial for early access to new collections and brand story logs.
          </p>
          {subscribed ? (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
              <Check size={16} />
              <span>Bespoke Access Confirmed</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="bg-transparent border-b border-slate-200 dark:border-slate-800 focus:border-indigo-500 text-xs px-0 py-2 outline-none transition-colors"
              />
              <button
                type="submit"
                className="bg-indigo-600 text-white py-3 text-xs uppercase tracking-widest font-bold rounded-xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/10"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="px-5 md:px-16 py-6 border-t border-slate-200/50 dark:border-slate-800/30 text-center max-w-[1440px] mx-auto text-[9px] uppercase tracking-widest text-slate-400">
        <p>© 2026 Cloths Shop. All rights reserved.</p>
      </div>
    </footer>
  );
}
