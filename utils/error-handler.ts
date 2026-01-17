export function getUserFriendlyErrorMessage(error: any): string {
    if (!error) return "Une erreur inconnue est survenue.";

    const message = typeof error === 'string' ? error : error.message || JSON.stringify(error);

    // Supabase / Postgres Errors
    if (message.includes('fetch failed')) return "Problème de connexion. Vérifiez votre réseau.";
    if (message.includes('Database error')) return "Une erreur système est survenue. Réessayez plus tard.";
    if (message.includes('duplicate key value')) return "Cet élément existe déjà dans le système.";
    if (message.includes('violates foreign key constraint')) return "Opération impossible : dépendances manquantes.";
    if (message.includes('violates row-level security policy')) return "Action non autorisée.";
    if (message.includes('invalid input syntax')) return "Données invalides fournies.";
    if (message.includes('relation') && message.includes('does not exist')) return "Erreur de configuration système (Table manquante).";

    // Storage Errors
    if (message.includes('EntityTooLarge') || message.includes('too large')) return "Le fichier est trop volumineux (Max 10 Mo).";
    if (message.includes('bucket not found')) return "Erreur de configuration (Stockage). Contactez le support.";

    // Auth Errors
    if (message.includes('Invalid login credentials')) return "Email ou mot de passe incorrect.";
    if (message.includes('User not found')) return "Compte utilisateur introuvable.";
    if (message.includes('Email not confirmed')) return "Veuillez confirmer votre email avant de vous connecter.";
    if (message.includes('weak_password')) return "Le mot de passe est trop faible. Utilisez plus de caractères.";
    if (message.includes('over_email_send_rate_limit')) return "Trop de tentatives d'envoi. Veuillez patienter.";

    // Next.js specific
    if (message.includes('NEXT_REDIRECT')) throw error; // Let Next.js redirects pass through

    // Fallback for technical strings that shouldn't be shown
    if (message.includes('{"')) return "Une erreur technique s'est produite.";

    // If it seems to be an intentional user-facing error (custom thrown), return it
    // We assume short messages without code syntax are safe.
    if (message.length < 200 && !message.includes('Error:') && !message.includes('at ')) {
        return message;
    }

    return "Une erreur inattendue est survenue.";
}
