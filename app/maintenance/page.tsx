import React from 'react'

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
            </div>

            <div className="relative z-10 max-w-2xl space-y-8">
                <div className="inline-block px-4 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] italic mb-4">
                    Système en Maintenance
                </div>
                
                <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">
                    Nous revenons <span className="premium-gradient-text">très vite.</span>
                </h1>
                
                <p className="text-slate-400 font-bold text-lg md:text-xl italic max-w-lg mx-auto leading-relaxed">
                    Creditly fait l&apos;objet d&apos;une mise à jour technique pour améliorer votre expérience. Merci de votre patience.
                </p>

                <div className="flex items-center justify-center gap-6 py-8">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-500">
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Optimisation</span>
                    </div>
                     <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-500">
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Sécurité</span>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-900">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic mb-2">Besoin d&apos;aide ?</p>
                    <a href="https://wa.me/2290169463004" className="text-white font-black hover:text-blue-500 transition-colors italic">
                        Contactez le Support Technique
                    </a>
                </div>
            </div>
        </div>
    )
}
