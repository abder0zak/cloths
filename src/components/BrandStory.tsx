import React from 'react';
import { ArrowRight, Feather, ShieldCheck, Heart } from 'lucide-react';

export default function BrandStory({ onChangeView }: { onChangeView: (view: string) => void }) {
  return (
    <div className="space-y-24 py-10 max-w-[1440px] mx-auto animate-fadeIn text-slate-900 dark:text-slate-100 px-4">
      
      {/* Intro Hero banner */}
      <section className="text-center space-y-6 max-w-2xl mx-auto">
        <span className="text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-extrabold">An Architectural Philosophy</span>
        <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tight leading-none text-slate-900 dark:text-slate-100">
          Quiet Sophistication through deliberate restraint
        </h1>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-light">
          We construct pieces that outlast seasonal tides. At Cloths Shop, our core belief is that every thread carries an architectural intent, combining sustainable sourcing with structural precision.
        </p>
      </section>

      {/* Philosophy Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="border border-slate-200 dark:border-slate-800 p-8 space-y-4 bg-white dark:bg-slate-900 rounded-3xl shadow-sm transition-all hover:border-indigo-500/30">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-2xl w-fit">
            <Feather size={24} />
          </div>
          <h3 className="font-display text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">Bespoke Curation</h3>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            We bypass bulk-order manufacturing. Every silhouette in our catalog is built in micro-batches using natural raw silks, organic cotton yarn, and certified Italian leather.
          </p>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 p-8 space-y-4 bg-white dark:bg-slate-900 rounded-3xl shadow-sm transition-all hover:border-indigo-500/30">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-2xl w-fit">
            <ShieldCheck size={24} />
          </div>
          <h3 className="font-display text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">Ethical Discretion</h3>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Discretion governs our entire operational network. From high-quality hand-stitched details to digital security shielding, your interactions are handled with maximum confidentiality.
          </p>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 p-8 space-y-4 bg-white dark:bg-slate-900 rounded-3xl shadow-sm transition-all hover:border-indigo-500/30">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-2xl w-fit">
            <Heart size={24} />
          </div>
          <h3 className="font-display text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">Timeless Lifespan</h3>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Our designs are not subject to rapid decay. They are formulated to develop beautiful natural character with age, creating reliable, lasting statements for your everyday wardrobe.
          </p>
        </div>
      </section>

      {/* Main Narrative Split block */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center border-t border-slate-200 dark:border-slate-800 pt-16">
        <div className="space-y-6">
          <span className="text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-extrabold">Our Atelier Roots</span>
          <h2 className="font-display text-3xl font-black uppercase tracking-tight leading-none text-slate-900 dark:text-slate-100">
            Designed for the modern, effortless wardrobe
          </h2>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Established in Milan and expanded digitally, Cloths Shop represents a return to classical atelier practices. By establishing secure full-stack shopping platforms and micro-dispatch hubs, we deliver high-fashion pieces directly with complete digital security, protecting both physical quality and virtual data.
          </p>
          <button 
            onClick={() => onChangeView('shop')}
            className="inline-flex items-center gap-2 border-b-2 border-slate-900 dark:border-slate-100 pb-1.5 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-600 dark:hover:border-indigo-400 transition-colors"
          >
            <span>Explore the Current Edit</span>
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="aspect-[4/3] bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-3xl flex items-center justify-center p-8 text-center relative overflow-hidden">
          {/* Typographic Artwork */}
          <div className="space-y-2 relative z-10 select-none">
            <span className="font-display text-6xl text-slate-950/5 dark:text-white/5 font-black block">CLOTHS</span>
            <span className="font-display text-4xl text-indigo-600/25 dark:text-indigo-400/25 font-black tracking-widest block">SHOP</span>
            <span className="font-mono text-[9px] text-slate-400 dark:text-slate-600 uppercase block">Atelier Coordinates: 45.4642° N, 9.1900° E</span>
          </div>
          <div className="absolute top-0 right-0 p-4 border-b border-l border-slate-200 dark:border-slate-800 text-[9px] font-mono text-slate-400">
            LOOKBOOK VER: 2026.04
          </div>
        </div>
      </section>
    </div>
  );
}
