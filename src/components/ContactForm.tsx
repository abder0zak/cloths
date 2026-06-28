import React, { useState } from 'react';
import { Mail, Compass, MessageSquare, CheckCircle, ArrowRight } from 'lucide-react';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit ticket');

      setSuccess(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 animate-fadeIn">
      {success ? (
        <div className="border border-[#eae8e7] dark:border-[#222222] bg-white dark:bg-[#151515] p-8 text-center space-y-6">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={28} />
          </div>
          <div className="space-y-2">
            <h2 className="font-display-lg text-2xl text-black dark:text-white">Message Transmitted</h2>
            <p className="text-xs text-[#747878] leading-relaxed max-w-sm mx-auto">
              Your inquiry has been successfully parsed by our brand curation team. An automated notification receipt has been dispatched to your email.
            </p>
          </div>
          <div className="p-3 bg-[#f5f3f3] dark:bg-[#1d1d1d] text-[10px] text-[#444748] dark:text-[#b0b0b0] border border-[#eae8e7] dark:border-[#333] leading-relaxed max-w-sm mx-auto">
            <strong>System Sync Verified:</strong> You can inspect the email simulation in the **Email Server Logs** under your account **Dashboard** (Admins only).
          </div>
          <button
            onClick={() => setSuccess(false)}
            className="border border-black dark:border-white px-6 py-2.5 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
          >
            Submit Another Ticket
          </button>
        </div>
      ) : (
        <div className="border border-[#eae8e7] dark:border-[#222222] bg-white dark:bg-[#151515] p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2 mb-4">
            <span className="text-[10px] uppercase tracking-widest text-[#747878]">Support Suite</span>
            <h2 className="font-display-lg text-2xl text-black dark:text-white">Connect with Curators</h2>
            <p className="text-xs text-[#747878]">Leave your details below, and an Editorial Representative will contact you.</p>
          </div>

          {error && (
            <div className="p-3 bg-[#ffdad6] text-[#93000a] text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-black dark:text-white">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#444748] dark:text-[#a0a0a0] mb-1">
                Your Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full border border-[#c4c7c7] dark:border-[#333] bg-transparent text-xs px-3 py-2.5 outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#444748] dark:text-[#a0a0a0] mb-1">
                Email Index
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full border border-[#c4c7c7] dark:border-[#333] bg-transparent text-xs px-3 py-2.5 outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#444748] dark:text-[#a0a0a0] mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Custom tailoring inquiry"
                className="w-full border border-[#c4c7c7] dark:border-[#333] bg-transparent text-xs px-3 py-2.5 outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#444748] dark:text-[#a0a0a0] mb-1">
                Detailed Message
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your question or request here..."
                className="w-full border border-[#c4c7c7] dark:border-[#333] bg-transparent text-xs p-3 outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black dark:bg-white text-white dark:text-black py-3.5 text-xs font-medium uppercase tracking-widest hover:opacity-90 active:opacity-100 transition-opacity flex items-center justify-center gap-1.5"
            >
              <span>{loading ? 'Transmitting...' : 'Send Inquiry'}</span>
              {!loading && <ArrowRight size={14} />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
