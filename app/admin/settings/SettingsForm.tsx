'use client'

import { useState } from 'react'
import { updateSystemSetting } from './actions'
import { Save, CheckmarkFilled, Warning } from '@carbon/icons-react'

export default function SettingsForm({ initialSettings }: { initialSettings: any[] }) {
    const [settings, setSettings] = useState(initialSettings)
    const [savingKey, setSavingKey] = useState<string | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleUpdate = async (key: string, value: string) => {
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
                                <div className="flex-1 space-y-4">
                                    <textarea
                                        defaultValue={typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value, null, 2)}
                                        onBlur={(e) => {
                                            try {
                                                const parsed = JSON.parse(e.target.value)
                                                if (JSON.stringify(parsed) !== JSON.stringify(setting.value)) {
                                                    handleUpdate(setting.key, e.target.value)
                                                }
                                            } catch (err) {
                                                setMessage({ type: 'error', text: 'Format JSON invalide.' })
                                            }
                                        }}
                                        rows={8}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:border-blue-500/50 outline-none transition-all"
                                    />
                                    <p className="text-[9px] text-slate-500 font-bold uppercase italic tracking-widest">Format: [&#123; "email": "...", "share": 0.1, "color": "#...", "name": "..." &#125;]</p>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        defaultValue={setting.value}
                                        onBlur={(e) => {
                                            if (e.target.value !== setting.value) {
                                                handleUpdate(setting.key, e.target.value)
                                            }
                                        }}
                                        className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-black italic focus:border-blue-500/50 outline-none transition-all"
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
