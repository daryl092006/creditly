'use client'

import { useState } from 'react'
import { updateSystemSetting } from './actions'
import { Save, CheckmarkFilled, Warning, TrashCan, Add, User, ChartPie } from '@carbon/icons-react'

export default function SettingsForm({ initialSettings }: { initialSettings: any[] }) {
    const [settings, setSettings] = useState(initialSettings)
    const [savingKey, setSavingKey] = useState<string | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleUpdate = async (key: string, value: any) => {
        setSavingKey(key)
        setMessage(null)

        const res = await updateSystemSetting(key, value)

        if (res?.error) {
            setMessage({ type: 'error', text: res.error })
        } else {
            setMessage({ type: 'success', text: 'Paramètre mis à jour avec succès.' })
            setSettings(settings.map(s => s.key === key ? { ...s, value } : s))
        }
        setSavingKey(null)
    }

    return (
        <div className="space-y-8">
            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-fade-in ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                    {message.type === 'success' ? <CheckmarkFilled size={20} /> : <Warning size={20} />}
                    <p className="text-xs font-bold italic">{message.text}</p>
                </div>
            )}

            <div className="space-y-6">
                {settings.map((setting) => (
                    <div key={setting.key} className="p-6 rounded-2xl bg-slate-950/50 border border-white/5 space-y-4 hover:border-slate-700 transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{setting.key.replace(/_/g, ' ')}</h4>
                                <p className="text-sm font-bold text-slate-300 italic">{setting.description}</p>
                            </div>
                            <div className="text-[10px] text-slate-600 font-bold uppercase italic">
                                Modifié le {new Date(setting.updated_at).toLocaleDateString()}
                            </div>
                        </div>

                        <div className="flex gap-4 items-center">
                            {setting.key === 'maintenance_mode' ? (
                                <button
                                    onClick={() => handleUpdate(setting.key, setting.value === 'true' ? 'false' : 'true')}
                                    disabled={savingKey === setting.key}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 outline-none focus:ring-4 focus:ring-blue-500/10 ${setting.value === 'true' ? 'bg-amber-500' : 'bg-slate-800'}`}
                                >
                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-all duration-300 shadow-lg ${setting.value === 'true' ? 'translate-x-7' : 'translate-x-1'}`} />
                                    {savingKey === setting.key && (
                                        <div className="absolute inset-0 bg-white/20 rounded-full flex items-center justify-center">
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </button>
                            ) : setting.key === 'shareholders_config' ? (
                                <div className="flex-1 space-y-6">
                                    {(() => {
                                        let sharesList: any[] = []
                                        try {
                                            sharesList = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value
                                            if (!Array.isArray(sharesList)) sharesList = []
                                        } catch (e) {
                                            sharesList = []
                                        }

                                        const totalShare = sharesList.reduce((acc, s) => acc + (parseFloat(s.share) || 0), 0)
                                        const isBalanced = Math.abs(totalShare - 1) < 0.0001

                                        const updateList = (newList: any[]) => {
                                            handleUpdate(setting.key, newList)
                                        }

                                        return (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {sharesList.map((sh, idx) => (
                                                        <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-3 relative group/sh">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg" style={{ backgroundColor: sh.color || '#3b82f6' }}>
                                                                    <User size={16} className="text-white" />
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={sh.name}
                                                                    placeholder="Nom"
                                                                    onChange={(e) => {
                                                                        const next = [...sharesList]
                                                                        next[idx].name = e.target.value
                                                                        setSettings(settings.map(s => s.key === setting.key ? { ...s, value: next } : s))
                                                                    }}
                                                                    onBlur={() => updateList(sharesList)}
                                                                    className="bg-transparent border-none text-white font-black italic text-sm focus:ring-0 w-full p-0"
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        const next = sharesList.filter((_, i) => i !== idx)
                                                                        updateList(next)
                                                                    }}
                                                                    className="opacity-0 group-hover/sh:opacity-100 p-2 text-slate-500 hover:text-red-500 transition-all border-none bg-transparent cursor-pointer"
                                                                >
                                                                    <TrashCan size={16} />
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Part (ex: 0.15 = 15%)</p>
                                                                    <input
                                                                        type="number"
                                                                        step="0.001"
                                                                        value={sh.share}
                                                                        onChange={(e) => {
                                                                            const next = [...sharesList]
                                                                            next[idx].share = parseFloat(e.target.value) || 0
                                                                            setSettings(settings.map(s => s.key === setting.key ? { ...s, value: next } : s))
                                                                        }}
                                                                        onBlur={() => updateList(sharesList)}
                                                                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/5 text-white font-mono text-xs focus:border-blue-500/50 outline-none"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Couleur Hex</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="color"
                                                                            value={sh.color}
                                                                            onChange={(e) => {
                                                                                const next = [...sharesList]
                                                                                next[idx].color = e.target.value
                                                                                setSettings(settings.map(s => s.key === setting.key ? { ...s, value: next } : s))
                                                                            }}
                                                                            onBlur={() => updateList(sharesList)}
                                                                            className="w-6 h-6 rounded border-none bg-transparent cursor-pointer p-0"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            value={sh.color}
                                                                            onChange={(e) => {
                                                                                const next = [...sharesList]
                                                                                next[idx].color = e.target.value
                                                                                setSettings(settings.map(s => s.key === setting.key ? { ...s, value: next } : s))
                                                                            }}
                                                                            onBlur={() => updateList(sharesList)}
                                                                            className="w-full bg-transparent border-none text-slate-400 font-mono text-[10px] focus:ring-0 p-0"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Email (Optionnel)</p>
                                                                <input
                                                                    type="email"
                                                                    value={sh.email || ''}
                                                                    onChange={(e) => {
                                                                        const next = [...sharesList]
                                                                        next[idx].email = e.target.value
                                                                        setSettings(settings.map(s => s.key === setting.key ? { ...s, value: next } : s))
                                                                    }}
                                                                    onBlur={() => updateList(sharesList)}
                                                                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/5 text-slate-400 font-bold text-[10px] focus:border-blue-500/50 outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <button
                                                        onClick={() => {
                                                            const next = [...sharesList, { name: 'Nouvel Associé', share: 0, color: '#64748b', email: '' }]
                                                            updateList(next)
                                                        }}
                                                        className="p-4 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-blue-500/30 hover:text-blue-500 transition-all bg-slate-900/20 cursor-pointer"
                                                    >
                                                        <Add size={24} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Ajouter un Associé</span>
                                                    </button>
                                                </div>

                                                <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xl ${isBalanced ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <ChartPie size={20} />
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-widest italic opacity-60 line-clamp-1">Répartition Totale des Parts</p>
                                                            <p className="text-xl font-black italic tracking-tighter">{(totalShare * 100).toFixed(1)} %</p>
                                                        </div>
                                                    </div>
                                                    {!isBalanced && (
                                                        <div className="text-right">
                                                            <p className="text-[8px] font-black uppercase leading-none mb-1">Déséquilibre</p>
                                                            <p className="text-[10px] font-bold italic">Le total doit être exactement 100%</p>
                                                        </div>
                                                    )}
                                                    {isBalanced && <CheckmarkFilled size={20} />}
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>
                            ) : (
                                <>
                                    <textarea
                                        defaultValue={typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value, null, 2)}
                                        onBlur={(e) => {
                                            try {
                                                const val = e.target.value
                                                // Try to parse if it looks like JSON to avoid saving escaped strings
                                                const parsed = (val.startsWith('{') || val.startsWith('[')) ? JSON.parse(val) : val
                                                handleUpdate(setting.key, parsed)
                                            } catch (err) {
                                                handleUpdate(setting.key, e.target.value)
                                            }
                                        }}
                                        rows={Math.min(10, (typeof setting.value === 'object' ? 8 : 1))}
                                        className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:border-blue-500/50 outline-none transition-all resize-y"
                                    />
                                    <button
                                        disabled={savingKey === setting.key}
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${savingKey === setting.key ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95'}`}
                                    >
                                        {savingKey === setting.key ? (
                                            <div className="w-4 h-4 border-2 border-slate-600 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <Save size={20} />
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
