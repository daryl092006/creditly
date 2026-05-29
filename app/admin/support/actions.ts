'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createSupportTicket(data: { subject: string; description: string; priority: string }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: userData.user.id,
      subject: data.subject,
      description: data.description,
      priority: data.priority,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating ticket:', error);
    throw new Error('Failed to create ticket');
  }

  revalidatePath('/dashboard/support');
  return ticket;
}

export async function assignTicket(ticketId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('support_tickets')
    .update({ agent_id: userData.user.id, status: 'in_progress' })
    .eq('id', ticketId);

  if (error) {
    console.error('Error assigning ticket:', error);
    throw new Error('Failed to assign ticket');
  }

  await logAuditAction('TICKET_ASSIGNED', ticketId, { ticket_id: ticketId });
  revalidatePath('/admin/support');
  revalidatePath(`/admin/support/ticket/${ticketId}`);
}

export async function resolveTicket(ticketId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('support_tickets')
    .update({ status: 'resolved', updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) {
    console.error('Error resolving ticket:', error);
    throw new Error('Failed to resolve ticket');
  }

  await logAuditAction('TICKET_RESOLVED', ticketId, { ticket_id: ticketId });
  revalidatePath('/admin/support');
  revalidatePath(`/admin/support/ticket/${ticketId}`);
}

export async function requestImpersonationSession(targetUserId: string, ticketId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes validity

  const otpCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digits OTP

  const { data: session, error } = await supabase
    .from('impersonation_sessions')
    .insert({
      agent_id: userData.user.id,
      target_user_id: targetUserId,
      ticket_id: ticketId,
      expires_at: expiresAt.toISOString(),
      otp_code: otpCode,
    })
    .select()
    .single();

  if (error) {
    console.error('Error requesting impersonation:', error);
    throw new Error('Failed to request impersonation session');
  }

  await logAuditAction('IMPERSONATION_REQUESTED', targetUserId, { ticket_id: ticketId, session_id: session.id });
  revalidatePath(`/admin/support/ticket/${ticketId}`);

  // Dans un cas réel on enverrait l'OTP par SMS / InApp au client ici

  return { sessionId: session.id, otp_code: otpCode }; // Retourné pour le démo, en vrai ne pas retourner à l'agent direct sans workflow
}

export async function startImpersonation(sessionId: string, otpCode: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  // Verify OTP
  const { data: session } = await supabase
    .from('impersonation_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session || session.otp_code !== otpCode) {
    throw new Error('Invalid OTP');
  }

  if (new Date(session.expires_at) < new Date()) {
    await supabase.from('impersonation_sessions').update({ status: 'expired' }).eq('id', sessionId);
    throw new Error('Session expired');
  }

  const { error } = await supabase
    .from('impersonation_sessions')
    .update({ status: 'active' })
    .eq('id', sessionId);

  if (error) throw new Error('Failed to start impersonation');

  await logAuditAction('IMPERSONATION_STARTED', session.target_user_id, { session_id: sessionId });
  revalidatePath('/admin/support');
  return { success: true };
}

export async function logAuditAction(actionType: string, targetId: string | null = null, metadata: any = {}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return; // Cannot log anonymously

  await supabase.from('audit_logs').insert({
    actor_user_id: userData.user.id,
    target_id: targetId || userData.user.id, // Fallback si null, le target_id est NOT NULL dans la db
    target_table: 'support_tickets',
    action_type: actionType,
    new_value_json: metadata
  });
}
