'use client';

import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-8 animate-fade-in relative z-10">
        
        {/* Glowing Background Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-[80px] -z-10" />

        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 rounded-full bg-[#111] border border-white/5 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-[#D4AF37]" />
          </div>
        </div>
        
        <div>
          <h1 className="text-7xl font-bold text-white mb-4 tracking-tighter">404</h1>
          <h2 className="text-2xl font-bold text-white/90 mb-4">Seite nicht gefunden</h2>
          <p className="text-white/60 mb-8">
            Die Seite, nach der du suchst, existiert nicht oder wurde verschoben.
          </p>
        </div>

        <Link 
          href="/"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#D4AF37] text-black font-bold uppercase tracking-widest rounded-2xl transition-all active:scale-95 hover:bg-[#F3E5AB]"
        >
          <Home size={20} />
          Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}
