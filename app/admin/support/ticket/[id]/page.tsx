import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { requestImpersonationSession, assignTicket } from '../../actions';

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

  const handleRequestImpersonation = async (formData: FormData) => {
    'use server';
    await requestImpersonationSession(ticket.user_id, ticket.id);
  };

  const handleAssign = async (formData: FormData) => {
    'use server';
    await assignTicket(ticket.id);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 shadow rounded-lg">
        <h1 className="text-2xl font-bold mb-2">Ticket #{ticket.id.split('-')[0]}</h1>
        <p className="text-gray-500 mb-4">Créé le {new Date(ticket.created_at).toLocaleString()}</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="font-semibold text-sm text-gray-500">Client (Prénom)</h3>
            <p className="text-lg">{ticket.users?.prenom}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-500">Statut du compte</h3>
            <p className="text-lg">{ticket.users?.is_account_active ? 'Actif' : 'Inactif'}</p>
          </div>
          <div className="col-span-2">
            <h3 className="font-semibold text-sm text-gray-500">Sujet</h3>
            <p className="text-lg font-medium">{ticket.subject}</p>
          </div>
          <div className="col-span-2">
            <h3 className="font-semibold text-sm text-gray-500">Description</h3>
            <p className="bg-gray-50 p-4 rounded mt-1">{ticket.description || 'Aucune description'}</p>
          </div>
        </div>

        {!ticket.agent_id ? (
          <form action={handleAssign}>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
              S'assigner le ticket
            </button>
          </form>
        ) : (
          <div className="text-sm text-indigo-600 font-medium border border-indigo-200 bg-indigo-50 p-2 rounded inline-block">
            Assigné à l'agent : {ticket.agent_id === userData.user.id ? 'Vous' : ticket.agent_id}
          </div>
        )}
      </div>

      <div className="bg-red-50 border border-red-200 p-6 shadow rounded-lg">
        <h2 className="text-xl font-bold text-red-800 mb-2">Mode Assistance Sécurisée</h2>
        <p className="text-sm text-red-600 mb-4">
          Le mode assistance vous permet de voir le compte du client en lecture seule. Toute action financière est interdite. 
          Un consentement par OTP est requis de la part du client.
        </p>

        {activeSession ? (
          <div className="bg-red-100 p-4 rounded text-red-900 font-bold border border-red-300">
            ⚠️ SESSION D'IMPERSONATION ACTIVE (Expire le {new Date(activeSession.expires_at).toLocaleTimeString()})
            <br/>
            <span className="text-sm font-normal">Toutes vos actions sont enregistrées dans l'Audit Log.</span>
            <div className="mt-4">
               {/* Link to view as client... */}
               <a href={`/dashboard?impersonate=${activeSession.id}`} target="_blank" className="bg-red-600 text-white px-4 py-2 rounded font-normal text-sm hover:bg-red-700">
                 Ouvrir l'écran du client
               </a>
            </div>
          </div>
        ) : pendingSession ? (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-yellow-800">
            ⏳ Demande en attente de validation par le client.
            <br/>
            <span className="text-sm">Le client doit fournir l'OTP : <strong>{pendingSession.otp_code}</strong> (pour démo)</span>
            
            {/* Form for agent to enter OTP if client gives it via chat */}
            <form action={`/api/support/verify-otp`} method="POST" className="mt-4 flex gap-2">
              <input type="hidden" name="sessionId" value={pendingSession.id} />
              <input type="text" name="otp" placeholder="Code OTP fourni par client" className="border p-2 rounded text-sm" />
              <button type="submit" className="bg-yellow-600 text-white px-4 py-2 rounded text-sm">Valider</button>
            </form>
          </div>
        ) : (
          <form action={handleRequestImpersonation}>
            <button 
              disabled={!ticket.agent_id} 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
            >
              Demander l'accès au compte (Nécessite Accord Client)
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
