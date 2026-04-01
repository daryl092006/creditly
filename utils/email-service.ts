import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const resendDaryl = new Resend(process.env.RESEND_API_KEY_DARYL || process.env.RESEND_API_KEY);

const adminEmail = process.env.ADMIN_EMAIL || 'creditly001@gmail.com';
const darylEmail = 'darylggt23@gmail.com';
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
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY non configurée. Notification email ignorée.');
        return;
    }

    let subject = '';
    let html = '';

    const formattedAmount = data.amount ? new Intl.NumberFormat('fr-FR').format(data.amount) + ' FCFA' : '';

    switch (type) {
        case 'LOAN_REQUEST':
            subject = `🚨 Nouvelle Demande de Prêt - ${data.userName}`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #2563eb; text-transform: uppercase; font-size: 18px;">Nouvelle Demande de Financement</h2>
                    <p>Bonjour Admin,</p>
                    <p>Un utilisateur vient de soumettre une nouvelle demande de prêt sur la plateforme.</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Candidat :</strong> ${data.userName} (${data.userEmail})</p>
                        <p><strong>Montant :</strong> <span style="font-size: 20px; color: #1e293b; font-weight: bold;">${formattedAmount}</span></p>
                        <p><strong>Réseau :</strong> ${data.payoutNetwork}</p>
                        <p><strong>Numéro MoMo :</strong> ${data.payoutPhone}</p>
                    </div>
                    <p>Veuillez vous connecter au tableau de bord pour valider ou rejeter cette demande.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/loans" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Accéder au Dashboard</a>
                </div>
            `;
            break;

        case 'REPAYMENT':
            subject = `💰 Nouveau Remboursement Soumis - ${data.userName}`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #059669; text-transform: uppercase; font-size: 18px;">Remboursement En Attente</h2>
                    <p>Un utilisateur a déclaré avoir effectué un remboursement.</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Candidat :</strong> ${data.userName}</p>
                        <p><strong>Montant payé :</strong> <span style="font-size: 20px; color: #1e293b; font-weight: bold;">${formattedAmount}</span></p>
                    </div>
                    <p>Veuillez vérifier votre compte Mobile Money et confirmer la réception dans le panel admin.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/repayments" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Vérifier les Paiements</a>
                </div>
            `;
            break;

        case 'KYC_SUBMISSION':
            subject = `🆔 Nouveau Dossier KYC à Valider - ${data.userName}`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #ea580c; text-transform: uppercase; font-size: 18px;">Validation d'Identité</h2>
                    <p>Un nouvel utilisateur a soumis ses documents KYC.</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Utilisateur :</strong> ${data.userName} (${data.userEmail})</p>
                        <p><strong>Statut :</strong> Dossier complet, en attente de revue.</p>
                    </div>
                    <p>L'approbation du KYC est nécessaire pour que l'utilisateur puisse souscrire un prêt.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/kyc" style="display: inline-block; background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Vérifier le Dossier</a>
                </div>
            `;
            break;

        case 'SUBSCRIPTION':
            subject = `✨ Nouvel Abonnement Activé - ${data.userName}`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #6366f1; text-transform: uppercase; font-size: 18px;">Nouvelle Souscription</h2>
                    <p>Une nouvelle demande d'abonnement a été faite ou validée.</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Client :</strong> ${data.userName}</p>
                        <p><strong>Offre :</strong> ${data.planName}</p>
                    </div>
                    <p>Veuillez confirmer le paiement si celui-ci est en attente.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/super/users" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Gestion des Comptes</a>
                </div>
            `;
            break;
    }

    try {
        // Envoi à Daryl pour prévisualisation
        await resendDaryl.emails.send({
            from: 'Creditly Preview <onboarding@resend.dev>',
            to: darylEmail,
            subject: `🚨 [PREVIEW] ${subject}`,
            html: `
                <div style="background-color: #fefce8; padding: 15px; border: 1px solid #fef08a; border-radius: 8px; margin-bottom: 20px; font-family: sans-serif;">
                    <p style="margin: 0; color: #854d0e; font-size: 13px; font-weight: bold;">
                        💡 CECI EST UNE PRÉ-NOTIFICATION (Review). 
                        L'email officiel sera envoyé à l'administration (${adminEmail}) dans 5 minutes.
                    </p>
                </div>
                ${html}
            `,
        });

        // Envoi PLANIFIÉ dans 5 minutes pour l'administration officielle (ou OWNER_EMAIL si adminEmail n'est pas configuré)
        const destinationEmail = adminEmail || OWNER_EMAIL;
        const scheduledDate = new Date(Date.now() + 5 * 60 * 1000);
        await resend.emails.send({
            from: 'Creditly Notifications <onboarding@resend.dev>',
            to: destinationEmail,
            subject: subject,
            html: html,
            scheduledAt: scheduledDate.toISOString()
        });
    } catch (error) {
        console.error('Erreur notifications admin:', error);
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
 * Envoie un email à l'utilisateur.
 */
export async function sendUserEmail(type: UserNotificationType, data: UserEmailData) {
    if (!process.env.RESEND_API_KEY) return;

    let subject = `Creditly - Notification ${type}`;
    let html = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2>Bonjour ${data.name},</h2>
            <p>Nous vous informons de la mise à jour suivante concernant votre compte Creditly :</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Statut :</strong> ${type}</p>
                ${data.amount ? `<p><strong>Montant :</strong> ${new Intl.NumberFormat('fr-FR').format(data.amount)} FCFA</p>` : ''}
                ${data.details ? `<p><strong>Détails :</strong> ${data.details}</p>` : ''}
            </div>
            <p>Merci de votre confiance.</p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/client/dashboard" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Accéder à mon espace</a>
        </div>
    `;

    try {
        // Envoi à Daryl pour prévisualisation
        await resendDaryl.emails.send({
            from: 'Creditly Preview <onboarding@resend.dev>',
            to: darylEmail,
            subject: `🚨 [PREVIEW CLIENT] ${subject}`,
            html: `
                <div style="background-color: #fefce8; padding: 15px; border: 1px solid #fef08a; border-radius: 8px; margin-bottom: 20px; font-family: sans-serif;">
                    <p style="margin: 0; color: #854d0e; font-size: 13px; font-weight: bold;">
                        💡 PRÉ-NOTIFICATION (Review Client). 
                        L'email officiel sera envoyé au client (${data.email}) dans 5 minutes.
                    </p>
                </div>
                ${html}
            `,
        });

        // Envoi à l'utilisateur (redirigé vers OWNER_EMAIL pendant les tests si nécessaire, ou direct)
        // Actuellement konfiguré pour envoyer réellement à l'utilisateur après 5 min de délai
        const scheduledDate = new Date(Date.now() + 5 * 60 * 1000);
        await resend.emails.send({
            from: 'Creditly <notifications@resend.dev>',
            to: data.email,
            subject: subject,
            html: html,
            scheduledAt: scheduledDate.toISOString()
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
        const subject = `[REPORT] Rapport Hebdomadaire - ${data.startDate}`;
        const html = `<h2>Rapport Financier</h2><p>Revenus: ${formattedTotal}</p>`;

        await resendDaryl.emails.send({
            from: 'Creditly Reports <reports@resend.dev>',
            to: darylEmail,
            subject: subject,
            html: html,
        });

        await resend.emails.send({
            from: 'Creditly <onboarding@resend.dev>',
            to: OWNER_EMAIL,
            subject: subject,
            html: html,
        });
    } catch (error) {
        console.error('[EmailService] Erreur sendWeeklyReport:', error);
    }
}
