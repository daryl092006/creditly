import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Chat, Identification, Warning, CheckmarkFilled, ChevronLeft } from '@carbon/icons-react';
import Link from 'next/link';

export default async function ClientTicketPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user) redirect('/auth/login');

    const { data: ticket } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', id)
        .eq('user_id', userData.user.id)
        .single();

    if (!ticket) notFound();

    const { data: sessions } = await supabase
        .from('impersonation_sessions')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: false });

    const pendingSession = sessions?.find((s: any) => s.status === 'pending');
    const activeSession = sessions?.find((s: any) => s.status === 'active');

    return (
        <div className="py-16 md:py-32 animate-fade-in">
            <div className="main-container max-w-4xl space-y-12">
                <Link href="/client/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest italic group">
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Retour à l'accueil
                </Link>

                <div className="glass-panel p-8 md:p-12 bg-slate-900/50 border-white/5 space-y-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Ticket #{ticket.id.slice(0, 8)}</h1>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Ouvert le {new Date(ticket.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div className={`px-4 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest italic ${ticket.status === 'open' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-white/5'
                            }`}>
                            {ticket.status}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-black text-blue-500 italic uppercase tracking-tighter">{ticket.subject}</h3>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-slate-300 leading-relaxed italic">
                            {ticket.description || 'Aucune description fournie.'}
                        </div>
                    </div>
                </div>

                {/* Impersonation Consent Workflow */}
                {(pendingSession || activeSession) && (
                    <div className={`glass-panel p-8 md:p-12 border-2 transition-all shadow-2xl ${activeSession ? 'bg-red-500/5 border-red-500/20' : 'bg-blue-600/5 border-blue-500/20 animate-pulse-subtle'
                        }`}>
                        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shrink-0 shadow-2xl ${activeSession ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'
                                }`}>
                                <Identification size={40} />
                            </div>
                            <div className="flex-1 space-y-6">
                                <div>
                                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">
                                        {activeSession ? 'Accès Autorisé' : 'Demande d\'Assistance à Distance'}
                                    </h2>
                                    <p className="text-sm font-bold text-slate-400 mt-2 italic">
                                        {activeSession
                                            ? "Un agent technique de Creditly a actuellement accès à votre interface en mode lecture seule pour vous aider."
                                            : "Un agent technique Creditly souhaite voir votre écran pour vous aider à résoudre votre problème."}
                                    </p>
                                </div>

                                {pendingSession && (
                                    <div className="space-y-6">
                                        <div className="p-6 bg-slate-950 rounded-2xl border border-white/5 flex flex-col items-center gap-4">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Votre code de sécurité à fournir à l'agent :</p>
                                            <div className="text-6xl font-black text-white tracking-[0.3em] tabular-nums italic">
                                                {pendingSession.otp_code}
                                            </div>
                                            <p className="text-[9px] font-bold text-red-500 uppercase italic">⚠️ Ne donnez ce code que si vous avez confiance en l'agent.</p>
                                        </div>
                                    </div>
                                )}

                                {activeSession && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 text-xs font-bold flex items-center gap-3 italic">
                                            <Warning size={16} /> Session sécurisée en cours. Pour révoquer l'accès, fermez ce ticket ou contactez le support.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="glass-panel p-8 md:p-12 bg-slate-900 border border-white/5 text-center space-y-6">
                    <Chat size={32} className="mx-auto text-slate-500" />
                    <div className="space-y-2">
                        <h4 className="text-lg font-black text-white uppercase italic tracking-tighter">Messagerie Directe</h4>
                        <p className="text-xs font-bold text-slate-500 italic">Notre équipe vous répondra dans les plus brefs délais directement sur ce ticket.</p>
                    </div>
                    <button className="premium-button py-4 px-10 grayscale opacity-50 cursor-not-allowed">
                        Option Messagerie Bientôt Disponibles
                    </button>
                </div>
            </div>
        </div>
    );
}
