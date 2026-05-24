import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Chat, UserMultiple, Flash, Warning, Rocket, ChevronRight } from '@carbon/icons-react';

export const metadata = {
  title: 'Centre de Support | Creditly Finance',
};

export default async function SupportDashboardPage() {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect('/auth/login');
  }

  // Fetch tickets
  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('*, users!support_tickets_user_id_fkey(prenom, email)')
    .order('created_at', { ascending: false });

  return (
    <div className="py-10 md:py-16 animate-fade-in sm:px-6">
      <div className="main-container space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase italic leading-none">Support & <br /> Assistance.</h1>
            <p className="text-slate-500 font-bold mt-4 italic leading-relaxed max-w-xl">
              Gestion des incidents, assistance sécurisée et ticketing client.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="px-6 py-3 bg-slate-900/50 border border-white/5 rounded-2xl">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1 italic">Tickets Ouverts</p>
              <p className="text-white font-black text-xl italic leading-none">{tickets?.filter(t => t.status === 'open').length || 0}</p>
            </div>
            <div className="px-6 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1 italic">En cours</p>
              <p className="text-white font-black text-xl italic leading-none">{tickets?.filter(t => t.status === 'in_progress').length || 0}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel overflow-hidden bg-slate-900/50 border-white/5 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 border-b border-white/5">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Flux / Date</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Client (PII Masqué*)</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sujet de l'incident</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Priorité</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Statut</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {!tickets?.length ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-slate-500 italic font-bold">
                      Aucun ticket détecté dans la base.
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket: any) => (
                    <tr key={ticket.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                            <Chat size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white italic truncate w-32">{ticket.id.slice(0, 8)}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(ticket.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-emerald-500 italic uppercase">{ticket.users?.prenom || 'Propriétaire'}</span>
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">N1 Identity Masking Active</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{ticket.subject}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${ticket.priority === 'urgent' ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' :
                            ticket.priority === 'high' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              'bg-slate-800 text-slate-500 border-white/5'
                          }`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${ticket.status === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                          <span className="text-[10px] font-black uppercase text-white italic">{ticket.status}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <Link
                          href={`/admin/support/ticket/${ticket.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl border border-blue-500/20 transition-all text-[10px] font-black uppercase tracking-widest italic group/link"
                        >
                          Traiter <ChevronRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
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
    </div>
  );
}
