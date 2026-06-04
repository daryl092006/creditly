'use client';

import { useActionState, useEffect, useRef } from 'react';
import { requestImpersonationSession } from '../../actions';

type ActionState = {
  error?: string;
  success?: boolean;
  sessionId?: string;
  otp_code?: string;
} | null;

async function requestImpersonationAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const targetUserId = formData.get('targetUserId') as string;
  const ticketId = formData.get('ticketId') as string;

  const result = await requestImpersonationSession(targetUserId, ticketId);

  if ('error' in result && result.error) {
    return { error: result.error };
  }

  return { success: true, sessionId: result.sessionId, otp_code: result.otp_code };
}

export default function ImpersonationForm({
  ticketId,
  targetUserId,
  isAssigned,
}: {
  ticketId: string;
  targetUserId: string;
  isAssigned: boolean;
}) {
  const [state, formAction, isPending] = useActionState(requestImpersonationAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Rafraîchir la page après succès pour afficher l'état "pending"
  useEffect(() => {
    if (state?.success) {
      // Petit délai pour que l'utilisateur voit le succès, puis reload pour afficher le pendingSession
      const timer = setTimeout(() => {
        window.location.reload();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state?.success]);

  if (!isAssigned) {
    return (
      <div className="w-full py-4 rounded-xl bg-slate-950 border border-white/5 text-slate-600 text-[10px] font-black uppercase tracking-widest italic flex items-center justify-center gap-3">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Assignez-vous d&apos;abord le ticket
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="w-full py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest italic flex items-center justify-center gap-3 animate-pulse">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
        Demande envoyée — rechargement…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="targetUserId" value={targetUserId} />
        <input type="hidden" name="ticketId" value={ticketId} />

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-4 rounded-xl bg-slate-950 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest italic hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {isPending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Envoi en cours…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Demander l&apos;accès sécurisé
            </>
          )}
        </button>
      </form>

      {state?.error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold italic leading-relaxed">
          <p className="font-black uppercase tracking-widest mb-1 text-red-500">Erreur</p>
          <p>{state.error}</p>
          {state.error.includes('row-level security') || state.error.includes('violates') ? (
            <p className="mt-2 text-slate-500">
              Votre compte doit avoir le rôle <span className="text-amber-400 font-black">support_n2</span> ou <span className="text-amber-400 font-black">superadmin</span> pour créer une session d&apos;impersonation.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
