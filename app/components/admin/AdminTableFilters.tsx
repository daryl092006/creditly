'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, Filter, ChevronLeft, ChevronRight, Close } from '@carbon/icons-react'

interface FilterOption {
    label: string
    value: string
}

interface AdminTableFiltersProps {
    placeholder?: string
    statusOptions?: FilterOption[]
    sortOptions?: FilterOption[]
    onSearchChange?: (value: string) => void
}

export default function AdminTableFilters({
    placeholder = "Rechercher...",
    statusOptions = [],
    sortOptions = []
}: AdminTableFiltersProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [query, setQuery] = useState(searchParams.get('q') || '')
    const currentStatus = searchParams.get('status') || 'all'
    const currentSort = searchParams.get('sort') || 'newest'
    const currentPage = parseInt(searchParams.get('page') || '1')

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query !== (searchParams.get('q') || '')) {
                updateParams({ q: query, page: '1' })
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [query])

    function updateParams(newParams: Record<string, string | null>) {
        const params = new URLSearchParams(searchParams.toString())
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null || value === 'all' || value === '') {
                params.delete(key)
            } else {
                params.set(key, value)
            }
        })
        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="flex flex-col md:flex-row items-center gap-4 p-6 bg-slate-900/40 border-b border-white/5 backdrop-blur-xl">
            {/* Search Bar */}
            <div className="relative flex-1 w-full group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                    <Search size={18} />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3 pl-12 pr-12 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium italic"
                />
                {query && (
                    <button
                        onClick={() => setQuery('')}
                        className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-white transition-colors"
                    >
                        <Close size={16} />
                    </button>
                )}
            </div>

            {/* Filters Group */}
            <div className="flex items-center gap-3 w-full md:w-auto">
                {statusOptions.length > 0 && (
                    <div className="relative flex-1 md:flex-none">
                        <select
                            value={currentStatus}
                            onChange={(e) => updateParams({ status: e.target.value, page: '1' })}
                            className="w-full appearance-none bg-slate-950/50 border border-white/10 rounded-2xl py-3 pl-4 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-400 focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer hover:bg-slate-900"
                        >
                            <option value="all">Tous les Statuts</option>
                            {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-600">
                            <Filter size={14} />
                        </div>
                    </div>
                )}

                {sortOptions.length > 0 && (
                    <div className="relative flex-1 md:flex-none">
                        <select
                            value={currentSort}
                            onChange={(e) => updateParams({ sort: e.target.value })}
                            className="w-full appearance-none bg-slate-950/50 border border-white/10 rounded-2xl py-3 pl-4 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-400 focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer hover:bg-slate-900"
                        >
                            {sortOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-600">
                            <ChevronDownIcon size={14} />
                        </div>
                    </div>
                )}

                {/* Pagination Controls */}
                <div className="flex items-center bg-slate-950/50 border border-white/10 rounded-2xl p-1 gap-1">
                    <button
                        onClick={() => updateParams({ page: Math.max(1, currentPage - 1).toString() })}
                        disabled={currentPage <= 1}
                        className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="px-3 text-[10px] font-black text-white italic tracking-tighter">
                        PAGE {currentPage}
                    </div>
                    <button
                        onClick={() => updateParams({ page: (currentPage + 1).toString() })}
                        className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-white transition-all"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    )
}

function ChevronDownIcon({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
    )
}
