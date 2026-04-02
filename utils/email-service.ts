import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const resendDaryl = new Resend(process.env.RESEND_API_KEY_DARYL || process.env.RESEND_API_KEY);

const adminEmail = process.env.ADMIN_EMAIL || 'creditly001@gmail.com';
const OWNER_EMAIL = 'creditly001@gmail.com';
const ADMIN_EMAILS_LIST = ['creditly001@gmail.com', 'darylggt23@gmail.com'];

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
 * Envoie une notification aux administrateurs via Resend.
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
        await resend.emails.send({
            from: 'Creditly Notifications <creditly001@gmail.com>',
            to: ADMIN_EMAILS_LIST,
            subject: subject,
            html: html,
        });
    } catch (error) {
        console.error('Erreur notifications admin (Resend):', error);
    }
}

type UserNotificationType = 'KYC_APPROVED' | 'KYC_REJECTED' | 'LOAN_APPROVED' | 'LOAN_REJECTED' | 'LOAN_ACTIVE' | 'REPAYMENT_VALIDATED' | 'REPAYMENT_REJECTED' | 'SUBSCRIPTION' | 'SUBSCRIPTION_REJECTED' | 'LOAN_REQUEST_RECEIVED' | 'REPAYMENT_RECEIVED' | 'KYC_SUBMISSION_RECEIVED' | 'SUBSCRIPTION_RECEIVED' | 'REPAYMENT_REMINDER';

interface UserEmailData {
    email: string;
    name: string;
    details?: string;
    amount?: number;
    planName?: string;
}

/**
 * Envoie un email à l'utilisateur via Resend.
 */
export async function sendUserEmail(type: UserNotificationType, data: UserEmailData) {
    if (!process.env.RESEND_API_KEY) return;

    let subject = `Creditly - Notification`;
    let html = '';

    // Personnalisation par type
    switch (type) {
        case 'LOAN_REQUEST_RECEIVED':
            subject = `📄 Nous avons bien reçu votre demande de prêt - Creditly`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #2563eb;">Bonjour ${data.name},</h2>
                    <p>Votre demande de prêt a bien été enregistrée sur notre plateforme.</p>
                    ${data.amount ? `<p><strong>Montant demandé :</strong> ${new Intl.NumberFormat('fr-FR').format(data.amount)} FCFA</p>` : ''}
                    <p>Notre équipe va analyser votre dossier dans les plus brefs délais. Vous recevrez une notification dès que la décision finale sera prise.</p>
                    <p style="font-size: 12px; color: #666; margin-top: 20px;">Merci de votre confiance, <br/>L'équipe Creditly</p>
                </div>
            `;
            break;

        case 'REPAYMENT_RECEIVED':
            subject = `💸 Accusé de réception - Remboursement initié`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #059669;">Bonjour ${data.name},</h2>
                    <p>Nous avons bien reçu votre déclaration de remboursement.</p>
                    ${data.amount ? `<p><strong>Montant payé :</strong> ${new Intl.NumberFormat('fr-FR').format(data.amount)} FCFA</p>` : ''}
                    <p>L'équipe comptable va vérifier ce paiement, et votre solde sera mis à jour une fois validé. Merci de votre régularité !</p>
                </div>
            `;
            break;

        case 'KYC_SUBMISSION_RECEIVED':
            subject = `🆔 Vos documents KYC ont été reçus - Creditly`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #ea580c;">Bonjour ${data.name},</h2>
                    <p>Nous avons bien reçu vos documents d'identité.</p>
                    <p>Notre équipe de conformité va examiner votre dossier pour valider l'activation complète de votre compte. Cette étape est obligatoire pour votre sécurité et pour garantir la législation en vigueur.</p>
                </div>
            `;
            break;

        case 'SUBSCRIPTION_RECEIVED':
            subject = `✨ Paiement d'abonnement en cours de vérification`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #6366f1;">Bonjour ${data.name},</h2>
                    <p>Nous avons bien reçu votre paiement pour l'offre <strong>${data.planName || 'Premium'}</strong>.</p>
                    <p>Un administrateur va vérifier instantanément la transaction. Dès l'approbation, l'accès à vos avantages de prêt sera débloqué automatiquement.</p>
                </div>
            `;
            break;

        case 'LOAN_APPROVED':
        case 'LOAN_ACTIVE':
            subject = `✅ Votre prêt Creditly est approuvé !`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #059669;">Bonjour ${data.name},</h2>
                    <p>🎉 Bonne nouvelle ! Votre demande de prêt a été <strong>approuvée</strong>.</p>
                    ${data.amount ? `<p><strong>Montant :</strong> ${new Intl.NumberFormat('fr-FR').format(data.amount)} FCFA</p>` : ''}
                    ${data.details ? `<p><strong>Informations :</strong> ${data.details}</p>` : ''}
                    <p>Vous recevrez votre virement très prochainement sur votre compte Mobile Money.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/client/dashboard" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Voir mon tableau de bord</a>
                </div>
            `;
            break;
        case 'LOAN_REJECTED':
            subject = `❌ Mise à jour de votre demande de prêt Creditly`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #dc2626;">Bonjour ${data.name},</h2>
                    <p>Nous avons examiné votre demande de prêt et nous ne sommes malheureusement pas en mesure de la valider pour le moment.</p>
                    ${data.details ? `<div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;"><p><strong>Motif :</strong> ${data.details}</p></div>` : ''}
                    <p>Vous pouvez soumettre une nouvelle demande une fois la situation régularisée.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/client/dashboard" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Voir mon tableau de bord</a>
                </div>
            `;
            break;
        case 'KYC_APPROVED':
            subject = `✅ Identité vérifiée - Compte Creditly activé`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #059669;">Bonjour ${data.name},</h2>
                    <p>Votre identité a été <strong>vérifiée avec succès</strong>. Vous pouvez maintenant souscrire un abonnement et faire votre première demande de prêt !</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/client/dashboard" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Accéder à mon espace</a>
                </div>
            `;
            break;
        case 'KYC_REJECTED':
            subject = `❌ Vérification d'identité - Action requise`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #dc2626;">Bonjour ${data.name},</h2>
                    <p>Votre dossier KYC n'a pas pu être validé.</p>
                    ${data.details ? `<div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;"><p><strong>Motif :</strong> ${data.details}</p></div>` : ''}
                    <p>Veuillez soumettre à nouveau votre dossier avec les corrections nécessaires.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/client/kyc" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Mettre à jour mon dossier</a>
                </div>
            `;
            break;
        case 'REPAYMENT_REMINDER':
            subject = `⏳ J-3 : Rappel d'échéance de votre prêt Creditly`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #ea580c;">Bonjour ${data.name},</h2>
                    <p>Ceci est un rappel amical vous informant que la date limite pour solder votre prêt arrive à échéance dans <strong>3 jours</strong>.</p>
                    ${data.amount ? `<div style="background-color: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea580c;"><p><strong>Preste à solder :</strong> ${new Intl.NumberFormat('fr-FR').format(data.amount)} FCFA</p></div>` : ''}
                    <p>Nous vous invitons à initier votre remboursement depuis votre tableau de bord afin d'éviter l'application automatique de frais de pénalité.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/client/loans/repayment" style="display: inline-block; background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Procéder au paiement</a>
                </div>
            `;
            break;

        case 'REPAYMENT_VALIDATED':
            subject = `✅ Remboursement validé - Creditly`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #059669;">Bonjour ${data.name},</h2>
                    <p>Votre remboursement a été <strong>validé</strong>. Merci !</p>
                    ${data.amount ? `<p><strong>Montant enregistré :</strong> ${new Intl.NumberFormat('fr-FR').format(data.amount)} FCFA</p>` : ''}
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/client/dashboard" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Voir mon tableau de bord</a>
                </div>
            `;
            break;
        case 'REPAYMENT_REJECTED':
            subject = `⚠️ Remboursement non confirmé - Creditly`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #d97706;">Bonjour ${data.name},</h2>
                    <p>Votre preuve de remboursement n'a pas pu être confirmée.</p>
                    ${data.details ? `<div style="background-color: #fffbeb; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;"><p><strong>Motif :</strong> ${data.details}</p></div>` : ''}
                    <p>Veuillez soumettre à nouveau votre preuve de paiement ou contacter le support.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/client/dashboard" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Voir mon tableau de bord</a>
                </div>
            `;
            break;
        case 'SUBSCRIPTION':
            subject = `✅ Votre abonnement Creditly est actif !`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #6366f1;">Bonjour ${data.name},</h2>
                    <p>Félicitations ! Votre souscription à l'offre <strong>${data.planName || 'Creditly'}</strong> a été validée.</p>
                    <p>Vous avez maintenant accès aux demandes de prêts correspondant à votre palier.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/client/dashboard" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Accéder à mon espace</a>
                </div>
            `;
            break;
        case 'SUBSCRIPTION_REJECTED':
            subject = `❌ Mise à jour de votre souscription Creditly`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #dc2626;">Bonjour ${data.name},</h2>
                    <p>Nous n'avons pas pu valider votre demande de souscription pour le moment.</p>
                    ${data.details ? `<div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;"><p><strong>Motif :</strong> ${data.details}</p></div>` : ''}
                    <p>Veuillez vérifier vos informations ou contacter le support si vous pensez qu'il s'agit d'une erreur.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/client/subscriptions" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Réessayer la souscription</a>
                </div>
            `;
            break;
    }

    try {
        await resend.emails.send({
            from: 'Creditly <creditly001@gmail.com>',
            to: data.email,
            subject: subject,
            html: html,
        });
    } catch (error) {
        console.error('[EmailService] Erreur sendUserEmail (Resend):', error);
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

        await resend.emails.send({
            from: 'Creditly Reports <creditly001@gmail.com>',
            to: ADMIN_EMAILS_LIST,
            subject: subject,
            html: html,
        });
    } catch (error) {
        console.error('[EmailService] Erreur sendWeeklyReport (Resend):', error);
    }
}

export async function sendPreNotification(email: string, name: string, message: string) {
    if (!process.env.RESEND_API_KEY_DARYL) return;

    try {
        await resendDaryl.emails.send({
            from: 'Creditly Alert <creditly001@gmail.com>',
            to: email,
            subject: '🔔 Rappel imminent - Creditly',
            html: `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #ea580c;">Bonjour ${name},</h2>
                    <p>${message}</p>
                    <p style="font-size: 12px; color: #666; margin-top: 20px;">Ceci est un rappel automatique envoyé 5 minutes avant l'échéance.</p>
                </div>
            `,
        });
    } catch (error) {
        console.error('[EmailService] Erreur sendPreNotification (Daryl):', error);
    }
}

export async function sendDirectClientEmail(email: string, name: string, subject: string, message: string) {
    if (!process.env.RESEND_API_KEY) return { error: "Service email non configuré." };

    try {
        await resend.emails.send({
            from: 'Creditly <creditly001@gmail.com>',
            to: email,
            subject: subject,
            html: `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #2563eb;">Bonjour ${name},</h2>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; line-height: 1.6;">
                        ${message.replace(/\n/g, '<br />')}
                    </div>
                    <p style="font-size: 12px; color: #666; margin-top: 20px;">Cordialement,<br/>L'équipe administrative Creditly</p>
                </div>
            `,
        });
        return { success: true };
    } catch (error: any) {
        console.error('[EmailService] Erreur sendDirectClientEmail:', error);
        return { error: error.message };
    }
}
