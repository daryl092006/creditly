import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requestImpersonationSession, assignTicket, resolveTicket } from '../../actions';

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) redirect('/auth/login');

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('*, users!support_tickets_user_id_fkey(prenom, is_account_active)')
    .eq('id', id)
    .single();

  if (!ticket) return <div>Ticket introuvable</div>;

  const { data: sessions } = await supabase
    .from('impersonation_sessions')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: false });

  const activeSession = sessions?.find((s: any) => s.status === 'active');
  const pendingSession = sessions?.find((s: any) => s.status === 'pending');

  return (
    <div className="py-10 md:py-16 animate-fade-in sm:px-6">
      <div className="main-container max-w-5xl space-y-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white leading-none">
              Incidents <br /><span className="premium-gradient-text uppercase">Client.</span>
            </h1>
            <p className="text-slate-500 font-bold italic leading-relaxed max-w-xl">
              Analyse détaillée et gestion sécurisée de l'incident technique.
            </p>
          </div>

          <div className="flex gap-4">
            <div className={`px-6 py-3 rounded-2xl border text-sm font-black uppercase tracking-widest italic ${ticket.status === 'open' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 animate-pulse' :
              ticket.status === 'resolved' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                'bg-slate-800 border-white/5 text-slate-500'
              }`}>
              {ticket.status}
            </div>
            <div className={`px-6 py-3 rounded-2xl border text-sm font-black uppercase tracking-widest italic ${ticket.priority === 'urgent' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
              ticket.priority === 'high' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                'bg-blue-500/10 border-blue-500/20 text-blue-500'
              }`}>
              Priorité {ticket.priority}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
          {/* Main Incident Details */}
          <div className="lg:col-span-2 space-y-10">
            <section className="glass-panel p-8 md:p-12 bg-slate-900 border-white/5 space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-[60px] pointer-events-none"></div>

              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 italic">Sujet de l'incident</p>
                  <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase leading-tight">{ticket.subject}</h2>
                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 italic">Message de l'utilisateur</p>
                  <div className="p-6 rounded-2xl bg-slate-950 border border-white/5 text-slate-300 italic leading-relaxed text-sm">
                    {ticket.description || "Aucune description fournie."}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Ticket ID</p>
                    <p className="text-xs font-black text-white italic">#{ticket.id.slice(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Catégorie</p>
                    <p className="text-xs font-black text-blue-400 italic uppercase">{ticket.category || "Inconnue"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Soumis le</p>
                    <p className="text-xs font-black text-slate-400 italic">{new Date(ticket.created_at).toLocaleString('fr-FR')}</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex flex-wrap gap-4">
                {!ticket.agent_id ? (
                  <form action={async () => { 'use server'; await assignTicket(ticket.id); }}>
                    <button className="px-8 py-4 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 italic">
                      S'assigner l'incident
                    </button>
                  </form>
                ) : (
                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 italic">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Assigné : {ticket.agent_id === userData.user.id ? 'Vous' : 'Agent ' + ticket.agent_id.slice(0, 4)}
                    </span>
                  </div>
                )}

                {ticket.status !== 'resolved' && ticket.agent_id === userData.user.id && (
                  <form action={async () => { 'use server'; await resolveTicket(ticket.id); }}>
                    <button className="px-8 py-4 rounded-xl bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all italic">
                      Marquer comme Résolu
                    </button>
                  </form>
                )}
              </div>
            </section>

            {/* Impersonation Actions (Restyled) */}
            <section className="glass-panel p-8 md:p-12 border-red-500/30 bg-red-500/5 space-y-8">
              <div className="flex gap-6 items-start">
                <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center shrink-0 border border-red-500/30">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">Intervention à Distance</h3>
                  <p className="text-xs font-bold text-red-500/80 italic leading-relaxed">
                    L'impersonation permet d'accéder au compte client pour diagnostiquer le problème.
                    Un consentement par OTP est impératif pour garantir la sécurité.
                  </p>
                </div>
              </div>

              {activeSession ? (
                <div className="p-6 rounded-2xl bg-red-600 text-white space-y-6 shadow-2xl shadow-red-500/30 italic">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-black uppercase tracking-widest">⚠️ Session de Lecture Active</p>
                    <p className="text-[10px] font-bold uppercase opacity-80 underline underline-offset-4">Expire : {new Date(activeSession.expires_at).toLocaleTimeString()}</p>
                  </div>
                  <a
                    href={`/dashboard?impersonate=${activeSession.id}`}
                    target="_blank"
                    className="w-full flex items-center justify-center py-4 bg-white text-red-600 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-transform"
                  >
                    Ouvrir l'écran du client
                  </a>
                </div>
              ) : pendingSession ? (
                <div className="p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 animate-pulse">
                  <p className="text-xs font-black uppercase tracking-widest mb-4">⏳ En attente de validation</p>
                  <p className="text-sm font-bold italic mb-6">Le client a reçu sa demande sur sa page ticket. Code OTP attendu : <span className="text-white font-black">{pendingSession.otp_code}</span></p>

                  <form action={`/api/support/verify-otp`} method="POST" className="flex flex-col sm:flex-row gap-4">
                    <input type="hidden" name="sessionId" value={pendingSession.id} />
                    <input name="otp" type="text" maxLength={4} placeholder="Code OTP client" className="bg-slate-950 border border-amber-500/30 rounded-xl px-5 py-3 text-white font-black italic uppercase outline-none focus:border-amber-500" />
                    <button type="submit" className="px-8 py-3 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Confirmer l'accès</button>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                  </form>
                </div>
              ) : (
                <form action={async () => { 'use server'; await requestImpersonationSession(ticket.user_id, ticket.id); }}>
                  <button
                    disabled={!ticket.agent_id}
                    className="w-full py-4 rounded-xl bg-slate-950 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest italic hover:bg-red-500 hover:text-white transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                  >
                    Demander l'accès sécurisé
                  </button>
                </form>
              )}
            </section>
          </div>

          {/* Context Sidebar */}
          <div className="space-y-10">
            {/* User Meta */}
            <section className="glass-panel p-8 bg-slate-900/50 border-white/5 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-500 border border-blue-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </div>
                <div>
                  <p className="text-xl font-black text-white italic tracking-tighter leading-none">{ticket.users?.prenom || "Profil Masqué"}</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">Compte {ticket.users?.is_account_active ? 'Actif' : 'Bloqué'}</p>
                </div>
              </div>

              {/* AUTOMATED CONTEXT (NEW) */}
              <div className="space-y-6 pt-4">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] italic border-b border-white/5 pb-2">Contexte Automatique</p>

                {ticket.context_json ? (
                  <div className="grid grid-cols-1 gap-4">
                    {ticket.context_json.page && (
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Provenance</p>
                        <p className="text-[10px] font-bold text-white italic truncate">{ticket.context_json.page}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">KYC</p>
                        <p className={`text-[10px] font-bold italic uppercase ${ticket.context_json.kycStatus === 'verified' ? 'text-emerald-500' : 'text-amber-500'}`}>{ticket.context_json.kycStatus || "Inconnu"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Risque</p>
                        <p className="text-[10px] font-bold text-blue-400 italic uppercase">{ticket.context_json.riskClass || "STANDARD"}</p>
                      </div>
                    </div>
                    {ticket.context_json.activeSubscription && (
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Abonnement Actif</p>
                        <p className="text-[10px] font-bold text-slate-300 italic">{ticket.context_json.activeSubscription}</p>
                      </div>
                    )}

                    {/* Error Snippet */}
                    {(ticket.context_json.errorMessage || ticket.context_json.errorCode) && (
                      <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 space-y-1">
                        <p className="text-[8px] font-black text-red-500 uppercase tracking-widest italic">Erreur Catchée</p>
                        <p className="text-[10px] font-bold text-slate-400 italic leading-tight">{ticket.context_json.errorMessage}</p>
                        {ticket.context_json.errorCode && <p className="text-[8px] font-black text-slate-600">Code: {ticket.context_json.errorCode}</p>}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] font-bold text-slate-600 italic">Aucun contexte technique disponible.</p>
                )}
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <Link
                  href={`/admin/super/users/${ticket.user_id}`}
                  className="w-full block py-3 rounded-xl bg-slate-950 border border-white/5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic hover:bg-white/5 transition-all"
                >
                  Voir l'intégralité du profil
                </Link>
                <Link
                  href="/admin/support"
                  className="w-full block py-3 rounded-xl text-center text-[10px] font-black text-slate-600 uppercase tracking-widest italic hover:text-white transition-all underline decoration-slate-800"
                >
                  Liste des incidents
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
