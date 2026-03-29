import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
// Note: Actuellement configuré pour creditly001 uniquement car pas de domaine vérifié sur Resend.
const OWNER_EMAIL = 'creditly001@gmail.com'; 

type NotificationType = 'LOAN_REQUEST' | 'REPAYMENT' | 'KYC_SUBMISSION' | 'SUBSCRIPTION';

interface NotificationData {
    userEmail: string;
    userName: string;
    amount?: number;
    planName?: string;
    payoutNetwork?: string;
    payoutPhone?: string;
}

/**
 * Envoie une notification aux administrateurs.
 * Temporairement redirigé vers l'owner du compte Resend uniquement.
 */
export async function sendAdminNotification(type: NotificationType, data: NotificationData) {
    if (!process.env.RESEND_API_KEY) return;

    let subject = '';
    let html = '';
    const formattedAmount = data.amount ? new Intl.NumberFormat('fr-FR').format(data.amount) + ' FCFA' : '';

    switch (type) {
        case 'LOAN_REQUEST':
            subject = `🚨 Nouvelle Demande - ${data.userName}`;
            html = `<h2>Demande de Prêt</h2>
                   <p><strong>Candidat:</strong> ${data.userName} (${data.userEmail})</p>
                   <p><strong>Montant:</strong> ${formattedAmount}</p>
                   <p><strong>Paiement:</strong> ${data.payoutPhone} (${data.payoutNetwork})</p>
                   <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/loans">Voir Dashboard</a>`;
            break;
        case 'REPAYMENT':
            subject = `💰 Remboursement - ${data.userName}`;
            html = `<h2>Remboursement</h2><p>Montant: ${formattedAmount}</p>
                   <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/repayments">Vérifier</a>`;
            break;
        default:
            subject = `Notification Admin - ${type}`;
            html = `<p>${type} de ${data.userName}</p>`;
    }

    try {
        console.log(`[EmailService] Admin Notification ONLY to: ${OWNER_EMAIL}`);
        await resend.emails.send({
            from: 'Creditly <onboarding@resend.dev>',
            to: OWNER_EMAIL,
            subject: `[ADMIN] ${subject}`,
            html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;">${html}</div>`,
        });
    } catch (error) {
        console.error('[EmailService] Erreur sendAdminNotification:', error);
    }
}

type UserNotificationType = 'KYC_APPROVED' | 'KYC_REJECTED' | 'LOAN_APPROVED' | 'LOAN_REJECTED' | 'LOAN_ACTIVE' | 'REPAYMENT_VALIDATED' | 'REPAYMENT_REJECTED' | 'SUBSCRIPTION';

interface UserEmailData {
    email: string;
    name: string;
    details?: string;
    amount?: number;
    planName?: string;
}

/**
 * Envoie un email à l'utilisateur (actuellement redirigé vers l'owner pendant tests).
 */
export async function sendUserEmail(type: UserNotificationType, data: UserEmailData) {
    if (!process.env.RESEND_API_KEY) return;

    try {
        console.log(`[EmailService] User Email to ${data.email} REDIRECTED to Owner (${OWNER_EMAIL})`);
        const formattedAmount = data.amount ? new Intl.NumberFormat('fr-FR').format(data.amount) + ' FCFA' : '';
        
        // Tout vers l'owner pour l'instant
        await resend.emails.send({
            from: 'Creditly <onboarding@resend.dev>',
            to: OWNER_EMAIL,
            subject: `[UTILISATEUR: ${data.name}] Notification ${type}`,
            html: `<p>Notification ${type} pour ${data.name} (${data.email}) : <strong>${formattedAmount}</strong></p>
                   <p>${data.details || ''}</p>`,
        });
    } catch (error) {
        console.error('[EmailService] Erreur sendUserEmail:', error);
    }
}

interface WeeklyReportData {
    startDate: string;
    endDate: string;
    totalRevenue: number;
    subscriptionsRevenue: number;
    repaymentsRevenue: number;
    newSubscriptionsCount: number;
    repaymentsCount: number;
    monthToDateRevenue: number;
}

export async function sendWeeklyReport(data: WeeklyReportData) {
    if (!process.env.RESEND_API_KEY) return;

    try {
        const formattedTotal = new Intl.NumberFormat('fr-FR').format(data.totalRevenue) + ' FCFA';
        await resend.emails.send({
            from: 'Creditly <onboarding@resend.dev>',
            to: OWNER_EMAIL,
            subject: `[REPORT] Rapport Hebdomadaire - ${data.startDate}`,
            html: `<h2>Rapport Financier</h2><p>Revenus: ${formattedTotal}</p>`,
        });
    } catch (error) {
        console.error('[EmailService] Erreur sendWeeklyReport:', error);
    }
}
