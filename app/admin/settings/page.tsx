import { requireAdminRole } from '@/utils/admin-security'
import { getSystemSettings } from './actions'
import SettingsForm from './SettingsForm'
import { Settings } from '@carbon/icons-react'

export default async function SettingsPage() {
    await requireAdminRole(['owner'])
    const settings = await getSystemSettings()

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-12">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
                    <Settings size={32} />
                </div>
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Configuration <br /><span className="premium-gradient-text uppercase">Plateforme.</span></h1>
                    <p className="text-slate-500 font-bold italic text-sm">Contrôle technique des paramètres vitaux de Creditly</p>
                </div>
            </div>

            <div className="glass-panel p-8 bg-slate-900/50 border-slate-800">
                <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                    <p className="text-xs font-bold text-amber-500 italic">⚠️ Attention : Vous modifiez ici des paramètres qui impactent directement les paiements et le fonctionnement légal. Toute erreur peut bloquer les transactions.</p>
                </div>

                <SettingsForm initialSettings={settings} />
            </div>
        </div>
    )
}
