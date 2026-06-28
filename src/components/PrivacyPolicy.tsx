import React from 'react';
import { ShieldCheck, Eye, Key, Heart } from 'lucide-react';

export default function PrivacyPolicy() {
  const sections = [
    {
      title: '1. Dynamic Shipment Cryptography',
      icon: <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400" />,
      body: 'To protect the visual discretion of your modern wardrobe acquisitions, all customer names, telephone indices, and shipping addresses are encrypted in real time before database persistence. We utilize the AES-256-CBC cryptographic standard. This process ensures that your details are only deciphered under explicit authorization during client care verification.'
    },
    {
      title: '2. User Authentication & JWT Safety',
      icon: <Key size={18} className="text-indigo-600 dark:text-indigo-400" />,
      body: 'To establish a persistent shopping experience, your session token is minted utilizing JSON Web Tokens (JWTs). This token is preserved inside your secure browser local storage, creating an isolated, secure state. Sessions automatically expire after 7 days of inactivity, minimizing risk under shared hardware access.'
    },
    {
      title: '3. WebSockets & Realtime Analytics',
      icon: <Eye size={18} className="text-indigo-600 dark:text-indigo-400" />,
      body: 'Our platform coordinates dynamic shop telemetry utilizing secure WebSocket pipelines. While active online shopper aggregates are broadcasted to push instant dashboard updates, no individual PII or clickstream identities are parsed or linked during this transmission. Your real-time presence is completely anonymized.'
    },
    {
      title: '4. Support Forms & Contact Integrity',
      icon: <Heart size={18} className="text-indigo-600 dark:text-indigo-400" />,
      body: 'When submitting inquiries through our client support terminal, the name, email, and message data is routed strictly to notify a designated brand curator. An automated alert receipt is dispatched to your email for security logging, and copy records are permanently expunged upon ticket resolution.'
    }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-12 py-10 animate-fadeIn px-4">
      {/* Policy Header */}
      <header className="text-center space-y-4 pb-8 border-b border-slate-200 dark:border-slate-800">
        <span className="text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-extrabold">Regulatory Standards</span>
        <h1 className="font-display text-4xl text-slate-900 dark:text-slate-100 font-black uppercase tracking-tight">Bespoke Privacy Policy</h1>
        <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
          At Ethos Editorial, we believe digital elegance is rooted in privacy and discretion. This charter outlines our cryptographic methods and session governance.
        </p>
      </header>

      {/* Sections Grid */}
      <section className="space-y-6">
        {sections.map((sec, idx) => (
          <div key={idx} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl">
                {sec.icon}
              </span>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">{sec.title}</h2>
            </div>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed pl-1">
              {sec.body}
            </p>
          </div>
        ))}
      </section>

      {/* Footer Summary */}
      <footer className="p-6 bg-slate-50 dark:bg-slate-950/20 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 space-y-2">
        <p><strong>Compliance Officer:</strong> privacy@ethos-editorial.com</p>
        <p>© 2026 Ethos Editorial Inc. Last amended: June 28, 2026. All rights reserved.</p>
      </footer>
    </div>
  );
}
