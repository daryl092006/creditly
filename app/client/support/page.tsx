import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Chat, Help, ChevronRight, Add, Time, Warning } from '@carbon/icons-react';
import NewTicketForm from './NewTicketForm';

export default async function ClientSupportDashboard() {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user) redirect('/auth/login');

    const { data: tickets } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

    return (
        <div className="py-16 md:py-32 animate-fade-in">
            <div className="main-container space-y-12">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter premium-gradient-text leading-none">Centre d'Assistance.</h1>
                        <p className="text-slate-500 font-bold italic leading-relaxed max-w-xl text-lg">
                            Consultez vos demandes en cours ou ouvrez un nouvel incident technique.
                        </p>
                    </div>
                    <NewTicketForm />
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <div className="glass-panel p-2 bg-slate-900 shadow-2xl border-white/5 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-950/50 border-b border-white/5">
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ticket / Date</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sujet</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Statut</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {!tickets?.length ? (
                                            <tr>
                                                <td colSpan={4} className="px-8 py-20 text-center text-slate-500 italic font-bold">
                                                    Vous n'avez aucun ticket de support ouvert.
                                                </td>
                                            </tr>
                                        ) : (
                                            tickets.map((ticket) => (
                                                <tr key={ticket.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <p className="text-xs font-black text-white italic">#{ticket.id.slice(0, 8)}</p>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(ticket.created_at).toLocaleDateString()}</p>
                                                    </td>
                                                    <td className="px-8 py-6 font-bold text-slate-300 italic group-hover:text-white transition-colors">
                                                        {ticket.subject}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${ticket.status === 'open' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-white/5'
                                                            }`}>
                                                            {ticket.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <Link href={`/client/support/ticket/${ticket.id}`} className="inline-flex items-center gap-2 text-blue-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest italic group/link">
                                                            Détails <ChevronRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="glass-panel p-8 bg-blue-600/5 border-blue-500/20 shadow-2xl">
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-4">Assistance Directe</h3>
                            <p className="text-slate-400 font-bold mb-6 italic text-xs leading-relaxed">
                                Pour les urgences vitales (déblocage de prêt, erreur de paiement), privilégiez le contact via WhatsApp.
                            </p>
                            <Link href="https://wa.me/14383906281" className="premium-button w-full py-5">
                                <Chat size={20} /> Chat WhatsApp
                            </Link>
                        </div>

                        <div className="glass-panel p-8 bg-slate-900 border-white/5">
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-4">Sécurité & Confidentialité</h3>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="w-5 h-5 shrink-0 text-blue-500"><Time size={16} /></div>
                                    <p className="text-[11px] font-medium text-slate-500 italic">Temps de réponse moyen : 2 heures.</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-5 h-5 shrink-0 text-red-500"><Warning size={16} /></div>
                                    <p className="text-[11px] font-medium text-slate-500 italic leading-relaxed">Vos données PII sont protégées et masquées pour les agents de niveau 1.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
