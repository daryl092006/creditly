import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// ─────────────────────────────────────────────────────────────────
// ARCHITECTURE EMAIL CREDITLY
// ─────────────────────────────────────────────────────────────────
// 🔴 ADMIN  → Resend (onboarding@resend.dev → creditly001@gmail.com)
//    Utilisé pour : Notifs d'action client (prêt, remboursement, KYC)
//    Fonctionne SANS domaine car Resend envoie AU compte owner (creditly001@gmail.com)
//
// 🔵 CLIENT → Gmail SMTP (creditly001@gmail.com → n'importe quel client)
//    Utilisé pour : Approbations, rejets, rappels, abonnements
//    Fonctionne SANS domaine via l'App Password Gmail
// ─────────────────────────────────────────────────────────────────

const GMAIL_USER = process.env.GMAIL_USER || 'creditly001@gmail.com';
const ADMIN_EMAILS_LIST = [GMAIL_USER, 'darylggt23@gmail.com'];

const resend = new Resend(process.env.RESEND_API_KEY);

function createGmailTransport() {
    if (!process.env.GMAIL_APP_PASSWORD) return null;
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
}

/**
 * UTILS: PREMIUM EMAIL WRAPPER
 * Utilise le template de marque pour tous les envois.
 */
export function wrapEmailTemplate(opts: {
    title: string;
    content: string;
    button?: { label: string; url: string };
}) {
    return `
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:40px 0; font-family:Arial, Helvetica, sans-serif;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.08); overflow:hidden;">

        <!-- Logo -->
        <tr>
          <td align="center" style="padding:30px;">
            <div style="display:inline-flex; align-items:center; gap:12px;">
              <div style="width:48px; height:48px; border-radius:12px; background:#2563eb; color:#ffffff; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:22px; font-style:italic;">
                C
              </div>
              <span style="font-size:22px; font-weight:900; letter-spacing:-1px; text-transform:uppercase; font-style:italic; color:#111827;">
                Creditly
              </span>
            </div>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding:0 40px 30px 40px; color:#374151;">
            <h2 style="margin-top:0; color:#111827; font-size:22px;">
              ${opts.title}
            </h2>

            <div style="font-size:15px; line-height:1.6;">
                ${opts.content}
            </div>

            <!-- Button -->
            ${opts.button ? `
            <div style="text-align:center; margin:30px 0;">
              <a href="${opts.button.url}"
                 style="background:#2563eb; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:8px; font-weight:700; font-size:15px; display:inline-block;">
                ${opts.button.label}
              </a>
            </div>` : '<div style="margin:30px 0;"></div>'}

            <p style="font-size:14px; color:#6b7280;">
              Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.
            </p>

            <p style="font-size:14px; margin-top:24px;">
              Cordialement,<br>
              <strong>L’équipe Creditly</strong>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb; padding:16px; text-align:center; font-size:12px; color:#9ca3af;">
            © Creditly – Tous droits réservés
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`;
}

/**
 * 🔴 NOTIF ADMIN — via Resend
 */
async function sendAdminAlert(opts: { subject: string; html: string }) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('[EmailService] RESEND_API_KEY manquant — notif admin ignorée.');
        return;
    }
    try {
        await resend.emails.send({
            from: 'Creditly Notifications <onboarding@resend.dev>',
            to: [GMAIL_USER],
            subject: opts.subject,
            html: opts.html,
        });
    } catch (error) {
        console.error('[EmailService] Erreur Resend admin:', error);
    }
}

/**
 * 🔵 EMAIL CLIENT — via Gmail SMTP
 */
async function sendEmail(opts: { from: string; to: string | string[]; subject: string; html: string }) {
    const gmailTransport = createGmailTransport();
    if (gmailTransport) {
        await gmailTransport.sendMail({
            from: `"${opts.from}" <${GMAIL_USER}>`,
            to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
            subject: opts.subject,
            html: opts.html,
        });
    } else {
        console.warn('[EmailService] ⚠️ GMAIL_APP_PASSWORD manquant — email client ignoré.');
    }
}

type NotificationType = 'LOAN_REQUEST' | 'REPAYMENT' | 'KYC_SUBMISSION' | 'SUBSCRIPTION' | 'LOAN_EXTENSION';

interface NotificationData {
    userEmail: string;
    userName: string;
    amount?: number;
    planName?: string;
    payoutNetwork?: string;
    payoutPhone?: string;
    loanId?: string;
    newDueDate?: string;
}

export async function sendAdminNotification(type: NotificationType, data: NotificationData) {
    let subject = '';
    let title = '';
    let content = '';
    let button: { label: string; url: string } | undefined;

    const formattedAmount = data.amount ? new Intl.NumberFormat('fr-FR').format(data.amount) + ' FCFA' : '';

    switch (type) {
        case 'LOAN_REQUEST':
            subject = `🚨 Nouvelle Demande de Prêt - ${data.userName}`;
            title = 'Nouvelle Demande de Financement';
            content = `
                <p>Bonjour Admin,</p>
                <p>Un utilisateur vient de soumettre une nouvelle demande de prêt sur la plateforme.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Candidat :</strong> ${data.userName} (${data.userEmail})</p>
                    <p><strong>Montant :</strong> <span style="font-size: 18px; color: #2563eb; font-weight: bold;">${formattedAmount}</span></p>
                    <p><strong>Réseau :</strong> ${data.payoutNetwork}</p>
                    <p><strong>Numéro MoMo :</strong> ${data.payoutPhone}</p>
                </div>
            `;
            button = { label: 'Accéder au Dashboard', url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/loans` };
            break;

        case 'REPAYMENT':
            subject = `💰 Nouveau Remboursement Soumis - ${data.userName}`;
            title = 'Remboursement En Attente';
            content = `
                <p>Un utilisateur a déclaré avoir effectué un remboursement.</p>
                <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Candidat :</strong> ${data.userName}</p>
                    <p><strong>Montant payé :</strong> <span style="font-size: 18px; color: #059669; font-weight: bold;">${formattedAmount}</span></p>
                </div>
                <p>Veuillez vérifier votre compte Mobile Money et confirmer la réception.</p>
            `;
            button = { label: 'Vérifier les Paiements', url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/repayments` };
            break;

        case 'KYC_SUBMISSION':
            subject = `🆔 Nouveau Dossier KYC à Valider - ${data.userName}`;
            title = 'Validation d\'Identité';
            content = `
                <p>Un nouvel utilisateur a soumis ses documents KYC.</p>
                <div style="background-color: #fffaf5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Utilisateur :</strong> ${data.userName} (${data.userEmail})</p>
                    <p><strong>Statut :</strong> Dossier complet, en attente de revue.</p>
                </div>
            `;
            button = { label: 'Vérifier le Dossier', url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/kyc` };
            break;

        case 'SUBSCRIPTION':
            subject = `✨ Nouvel Abonnement Activé - ${data.userName}`;
            title = 'Nouvelle Souscription';
            content = `
                <p>Une nouvelle demande d'abonnement a été faite ou validée.</p>
                <div style="background-color: #f5f3ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Client :</strong> ${data.userName}</p>
                    <p><strong>Offre :</strong> ${data.planName}</p>
                </div>
            `;
            button = { label: 'Gestion des Comptes', url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/super/users` };
            break;

        case 'LOAN_EXTENSION':
            subject = `⏳ Prolongation de Prêt - ${data.userName}`;
            title = 'Prolongation de Dossier';
            content = `
                <p>Un client a prolongé son prêt de 5 jours (frais de 500F appliqués).</p>
                <div style="background-color: #f5f3ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Candidat :</strong> ${data.userName} (${data.userEmail})</p>
                    <p><strong>Dossier ID :</strong> ${data.loanId}</p>
                    <p><strong>Nouvelle Échéance :</strong> <span style="font-weight: bold; color: #2563eb;">${data.newDueDate}</span></p>
                </div>
            `;
            break;
    }

    const html = wrapEmailTemplate({ title, content, button });
    await sendAdminAlert({ subject, html });
}

type UserNotificationType = 'KYC_APPROVED' | 'KYC_REJECTED' | 'LOAN_APPROVED' | 'LOAN_REJECTED' | 'LOAN_ACTIVE' | 'REPAYMENT_VALIDATED' | 'REPAYMENT_REJECTED' | 'SUBSCRIPTION' | 'SUBSCRIPTION_REJECTED' | 'LOAN_REQUEST_RECEIVED' | 'REPAYMENT_RECEIVED' | 'KYC_SUBMISSION_RECEIVED' | 'SUBSCRIPTION_RECEIVED' | 'REPAYMENT_REMINDER' | 'REPAYMENT_REMINDER_URGENT' | 'REPAYMENT_DUE_TODAY' | 'REPAYMENT_OVERDUE' | 'SUBSCRIPTION_EXPIRING' | 'SUBSCRIPTION_EXPIRING_URGENT' | 'LOAN_EXTENSION_CONFIRMED' | 'REMARKETING_NO_KYC' | 'REMARKETING_NO_LOAN';

interface UserEmailData {
    email: string;
    name: string;
    details?: string;
    amount?: number;
    planName?: string;
    expiresIn?: number;
    endDate?: string;
    renewUrl?: string;
    newDueDate?: string;
    fee?: number;
}

export async function sendUserEmail(type: UserNotificationType, data: UserEmailData) {
    let subject = `Creditly - Notification`;
    let title = '';
    let content = '';
    let button: { label: string; url: string } | undefined;

    const fmt = (val: number) => new Intl.NumberFormat('fr-FR').format(val) + ' FCFA';

    switch (type) {
        case 'LOAN_REQUEST_RECEIVED':
            subject = `📄 Nous avons bien reçu votre demande de prêt - Creditly`;
            title = 'Demande de Prêt Reçue';
            content = `
                <p>Bonjour ${data.name},</p>
                <p>Votre demande de prêt a bien été enregistrée sur notre plateforme.</p>
                ${data.amount ? `<p><strong>Montant demandé :</strong> ${fmt(data.amount)}</p>` : ''}
                <p>Notre équipe va analyser votre dossier dans les plus brefs délais.</p>
            `;
            break;

        case 'REPAYMENT_RECEIVED':
            subject = `💸 Accusé de réception - Remboursement`;
            title = 'Paiement en cours de validation';
            content = `
                <p>Bonjour ${data.name},</p>
                <p>Nous avons bien reçu votre déclaration de remboursement.</p>
                ${data.amount ? `<p><strong>Montant déclaré :</strong> ${fmt(data.amount)}</p>` : ''}
                <p>L'équipe comptable va vérifier ce paiement sous 24h.</p>
            `;
            break;

        case 'KYC_SUBMISSION_RECEIVED':
            subject = `🆔 Dossier KYC reçu - Creditly`;
            title = 'Vérification d\'identité';
            content = `<p>Bonjour ${data.name},</p><p>Vos documents d'identité ont bien été transmis. Notre équipe de conformité examine votre profil.</p>`;
            break;

        case 'SUBSCRIPTION_RECEIVED':
            subject = `✨ Paiement d'abonnement - Vérification`;
            title = 'Paiement de l\'offre ' + (data.planName || '');
            content = `<p>Bonjour ${data.name},</p><p>Nous avons reçu votre paiement. Votre accès premium sera débloqué dès validation de la transaction.</p>`;
            break;

        case 'LOAN_APPROVED':
        case 'LOAN_ACTIVE':
            subject = `✅ Votre prêt Creditly est approuvé !`;
            title = 'Félicitations, Prêt Approuvé !';
            content = `
                <p>Bonjour ${data.name},</p>
                <p>Votre demande de prêt de <strong>${data.amount ? fmt(data.amount) : ''}</strong> a été validée.</p>
                <p>Le virement est en cours vers votre compte Mobile Money.</p>
            `;
            button = { label: 'Voir mon Dashboard', url: `${process.env.NEXT_PUBLIC_SITE_URL}/client/dashboard` };
            break;

        case 'LOAN_REJECTED':
            subject = `❌ Mise à jour de votre demande de prêt`;
            title = 'Désolé, prêt non accordé';
            content = `
                <p>Bonjour ${data.name},</p>
                <p>Nous n'avons pas pu valider votre prêt pour le moment.</p>
                ${data.details ? `<div style="background:#fef2f2; padding:12px; margin:15px 0;"><strong>Motif :</strong> ${data.details}</div>` : ''}
            `;
            break;

        case 'KYC_APPROVED':
            subject = `✅ Compte Creditly activé`;
            title = 'Identité Vérifiée';
            content = `<p>Bonjour ${data.name},</p><p>Votre compte est désormais actif. Vous pouvez dès maintenant souscrire un abonnement.</p>`;
            button = { label: 'Accéder à mon espace', url: `${process.env.NEXT_PUBLIC_SITE_URL}/client/dashboard` };
            break;

        case 'KYC_REJECTED':
            subject = `❌ Action requise sur votre dossier KYC`;
            title = 'Dossier Non Conforme';
            content = `<p>Votre dossier KYC a été rejeté. ${data.details ? `<br/><strong>Motif :</strong> ${data.details}` : ''}</p>`;
            button = { label: 'Mettre à jour mon dossier', url: `${process.env.NEXT_PUBLIC_SITE_URL}/client/kyc` };
            break;

        case 'REPAYMENT_REMINDER':
            subject = `⏳ J-3 : Rappel d'échéance Creditly`;
            title = 'Date d\'échéance proche';
            content = `<p>Plus que 3 jours pour solder votre prêt de <strong>${data.amount ? fmt(data.amount) : ''}</strong>.</p>`;
            button = { label: 'Procéder au paiement', url: `${process.env.NEXT_PUBLIC_SITE_URL}/client/loans/repayment` };
            break;

        case 'REPAYMENT_REMINDER_URGENT':
            subject = `🚨 URGENT : Votre prêt expire DEMAIN`;
            title = 'Dernier Rappel';
            content = `<p>Le délai se termine demain. Évitez les pénalités de retard en régularisant aujourd'hui.</p>`;
            button = { label: 'Payer maintenant', url: `${process.env.NEXT_PUBLIC_SITE_URL}/client/loans/repayment` };
            break;

        case 'REPAYMENT_DUE_TODAY':
            subject = `⚠️ AUJOURD'HUI : Date limite de votre prêt`;
            title = 'Échéance aujourd\'hui';
            content = `<p>Veuillez soumettre votre preuve de paiement avant minuit pour conserver votre score de confiance.</p>`;
            button = { label: 'Régulariser immédiatement', url: `${process.env.NEXT_PUBLIC_SITE_URL}/client/loans/repayment` };
            break;

        case 'REPAYMENT_OVERDUE':
            subject = `❌ EN RETARD : Prêt en souffrance`;
            title = 'Retard de paiement constaté';
            content = `<p>Votre prêt est en retard. Des pénalités journalières sont désormais appliquées.</p>`;
            button = { label: 'Solder ma dette', url: `${process.env.NEXT_PUBLIC_SITE_URL}/client/loans/repayment` };
            break;

        case 'REPAYMENT_VALIDATED':
            subject = `✅ Remboursement validé - Creditly`;
            title = 'Félicitations, prêt soldé !';
            content = `<p>Votre remboursement de ${data.amount ? fmt(data.amount) : ''} a été validé. Merci pour votre régularité.</p>`;
            break;

        case 'SUBSCRIPTION':
            subject = `✅ Votre abonnement Creditly est actif !`;
            title = 'Bienvenue chez ' + (data.planName || 'Creditly');
            content = `<p>Votre abonnement est actif. Vous avez désormais accès aux demandes de prêt.</p>`;
            button = { label: 'Accéder à mon espace', url: `${process.env.NEXT_PUBLIC_SITE_URL}/client/dashboard` };
            break;

        case 'LOAN_EXTENSION_CONFIRMED':
            subject = `⏳ Confirmation de prolongation (+5 jours)`;
            title = 'Nouvelle échéance confirmée';
            content = `
                <p>Échéance reportée au <strong>${data.newDueDate}</strong>.</p>
                <p>Frais appliqués: ${fmt(data.fee || 500)}.</p>
            `;
            break;

        case 'REMARKETING_NO_KYC':
            subject = `🚀 Débloquez votre premier prêt sur Creditly`;
            title = 'Finalisez votre inscription';
            content = `
                <p>Bonjour ${data.name},</p>
                <p>Vous avez créé votre compte, mais vous n'avez pas encore soumis vos documents de vérification (KYC).</p>
                <p>C'est l'étape indispensable pour accéder à nos offres de financement rapides et sans tracas.</p>
            `;
            button = { label: 'Vérifier mon identité', url: `${process.env.NEXT_PUBLIC_SITE_URL}/client/kyc` };
            break;

        case 'REMARKETING_NO_LOAN':
            subject = `💸 Votre ligne de crédit est prête !`;
            title = 'Besoin d\'un coup de pouce ?';
            content = `
                <p>Bonjour ${data.name},</p>
                <p>Bonne nouvelle : votre compte est validé et vérifié !</p>
                <p>Saviez-vous que vous pouvez demander jusqu'à 800.000 FCFA en moins de 5 minutes ? Vos fonds sont prêts à être débloqués.</p>
            `;
            button = { label: 'Faire une demande de prêt', url: `${process.env.NEXT_PUBLIC_SITE_URL}/client/loans/request` };
            break;
    }

    const html = wrapEmailTemplate({ title, content, button });
    await sendEmail({ from: 'Creditly', to: data.email, subject, html });
}

export async function sendWeeklyReport(data: any) {
    if (!process.env.RESEND_API_KEY) return;
    const subject = `[REPORT] Rapport Hebdomadaire - ${data.startDate}`;
    const content = `
        <p>Résumé financier de la semaine :</p>
        <div style="background:#f8fafc; padding:15px; border-radius:8px;">
            <p><strong>Revenu Total :</strong> ${new Intl.NumberFormat('fr-FR').format(data.totalRevenue)} FCFA</p>
            <p><strong>Nouveaux Abonnés :</strong> ${data.newSubscriptionsCount}</p>
        </div>
    `;
    const html = wrapEmailTemplate({ title: 'Rapport Hebdomadaire', content });
    await sendEmail({ from: 'Creditly Reports', to: ADMIN_EMAILS_LIST, subject, html });
}

export async function sendPreNotification(email: string, name: string, message: string) {
    const content = `<p>Bonjour ${name},</p><p>${message}</p>`;
    const html = wrapEmailTemplate({ title: 'Rappel imminent', content });
    await sendEmail({ from: 'Creditly Alert', to: email, subject: '🔔 Rappel imminent - Creditly', html });
}

export async function sendDirectClientEmail(email: string, name: string, subject: string, message: string) {
    const content = `<p>Bonjour ${name},</p><div style="margin:20px 0;">${message.replace(/\n/g, '<br />')}</div>`;
    const html = wrapEmailTemplate({ title: subject, content });
    try {
        await sendEmail({ from: 'Creditly', to: email, subject, html });
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}
