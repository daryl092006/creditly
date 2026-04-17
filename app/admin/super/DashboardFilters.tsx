/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Filter, Calendar } from '@carbon/icons-react'

export function DashboardFilters({ currentMonth, currentYear, currentPeriod }: { currentMonth: number, currentYear: number, currentPeriod: string }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    function updateParams(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString())
        params.set(key, value)
        router.push(`${pathname}?${params.toString()}`)
    }

    const months = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ]

    return (
        <div className="flex flex-wrap md:flex-row items-stretch md:items-center gap-2 bg-slate-900/50 p-1.5 md:p-2 rounded-2xl md:rounded-3xl border border-slate-800 backdrop-blur-xl w-full md:w-auto overflow-hidden">
            {/* Period Selector */}
            <div className="flex p-1 bg-slate-950/50 rounded-xl md:rounded-2xl border border-white/5 w-full md:w-auto">
                {['month', 'week'].map((p) => (
                    <button
                        key={p}
                        onClick={() => updateParams('period', p)}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg md:rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentPeriod === p ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        {p === 'month' ? 'Mensuel' : 'Hebdo'}
                    </button>
                ))}
            </div>

            {currentPeriod === 'month' && (
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={currentMonth}
                        onChange={(e) => updateParams('month', e.target.value)}
                        className="flex-1 md:flex-none bg-slate-800 rounded-xl px-4 py-3 md:py-2 text-slate-200 font-black text-[10px] uppercase tracking-widest italic outline-none border border-white/5 cursor-pointer hover:bg-slate-700 transition-all text-center"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </select>

                    <select
                        value={currentYear}
                        onChange={(e) => updateParams('year', e.target.value)}
                        className="flex-1 md:flex-none bg-slate-800 rounded-xl px-4 py-3 md:py-2 text-slate-200 font-black text-[10px] uppercase tracking-widest italic outline-none border border-white/5 cursor-pointer hover:bg-slate-700 transition-all text-center"
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            )}

            {currentPeriod === 'week' && (
                <div className="flex-1 md:flex-none flex bg-slate-800 rounded-xl px-6 py-3 md:py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest italic items-center justify-center gap-2 border border-white/5">
                    <Calendar size={14} /> 7 Derniers Jours
                </div>
            )}
        </div>
    )
}
