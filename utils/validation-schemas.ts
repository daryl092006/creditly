import { z } from 'zod';

// Helper for file validation (optimistic, since File objects are not fully available in server actions depending on runtime)
// But for FormData entry, we can check basic props.
const FileSchema = z.custom<File>((val) => {
    return val && typeof val === 'object' && 'size' in val && 'name' in val && 'type' in val;
}, "Un fichier est requis")
    .refine((file) => file.size > 0, "Le fichier ne peut pas être vide")
    .refine((file) => file.size <= 5 * 1024 * 1024, "La taille du fichier ne doit pas dépasser 5MB");

export const LoanRequestSchema = z.object({
    amount: z.coerce.number()
        .positive("Le montant doit être positif")
        .min(1000, "Le montant minimum est de 1000 FCFA"),

    payoutPhone: z.string()
        .min(8, "Numéro de téléphone invalide")
        .max(15, "Numéro de téléphone trop long")
        .regex(/^[0-9+]+$/, "Le format du numéro est invalide"),

    payoutName: z.string()
        .min(2, "Le nom complet est trop court")
        .max(100, "Le nom complet est trop long"),

    payoutNetwork: z.enum(['MTN', 'Moov', 'Celtiis'], {
        errorMap: () => ({ message: 'Réseau invalide' })
    })
});

export const SubscriptionSchema = z.object({
    planId: z.string().uuid("ID de plan invalide"),
    amount: z.coerce.number().positive("Le montant doit être valide"),
    proof: FileSchema
});

export const RepaymentSchema = z.object({
    loanId: z.string().uuid("ID de prêt invalide"),
    amount: z.coerce.number().positive("Le montant doit être valide"),
    proof: FileSchema
});
