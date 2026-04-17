export default function Loading() {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl">
            <div className="relative">
                {/* Orbital Rings */}
                <div className="absolute inset-0 -m-4 border-2 border-blue-500/20 rounded-full animate-ping" />
                <div className="absolute inset-0 -m-8 border-2 border-indigo-500/10 rounded-full animate-pulse" />

                {/* Central Logo Box */}
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 animate-bounce">
                    <span className="text-3xl font-black italic">C</span>
                </div>

                <div className="absolute top-20 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400 animate-pulse">
                        Chargement Sécurisé
                    </span>
                </div>
            </div>
        </div>
    )
}
