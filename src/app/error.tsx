'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-8 animate-fade-in relative z-10">
        
        {/* Glowing Background Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] -z-10" />

        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 rounded-full bg-[#111] border border-red-500/20 flex items-center justify-center">
            <AlertOctagon className="w-12 h-12 text-red-500" />
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-white mb-4">Ein Fehler ist aufgetreten</h1>
          <p className="text-white/60 mb-8">
            Etwas ist schiefgelaufen. Bitte versuche es erneut oder kehre zur Startseite zurück.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#111] border border-white/10 text-white font-bold uppercase tracking-widest rounded-2xl transition-all active:scale-95 hover:bg-white/5"
          >
            <RefreshCcw size={20} />
            Erneut versuchen
          </button>
          
          <Link 
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#D4AF37] text-black font-bold uppercase tracking-widest rounded-2xl transition-all active:scale-95 hover:bg-[#F3E5AB]"
          >
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
