import { createAdminClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        // Security Check - Only superadmins, admin_comptable and owner can export full audit
        await requireAdminRole(['superadmin', 'admin_comptable', 'owner'])
        
        // Use Admin Client to bypass RLS for the comprehensive audit
        const supabase = await createAdminClient()

        // Fetch Data for Audit
        const { data: loans } = await supabase.from('prets').select('*, user:users(nom, prenom, email)')
        const { data: repayments } = await supabase.from('remboursements').select('*, user:users(nom, prenom, email)')
        const { data: subscriptions } = await supabase.from('user_subscriptions').select('*, user:users(nom, prenom, email), plan:abonnements(name, price)')

        // Improved CSV formatter with headers and BOM
        const formatSection = (title: string, headers: string[], rows: any[]) => {
            const sectionTitle = `${title.toUpperCase()}\n`;
            const headerRow = headers.join(',') + '\n';
            const dataRows = rows.map(r => 
                headers.map(h => {
                    const val = r[h] === null || r[h] === undefined ? '' : r[h];
                    return `"${String(val).replace(/"/g, '""')}"`;
                }).join(',')
            ).join('\n');
            return sectionTitle + headerRow + dataRows + '\n\n';
        }

        let csvContent = '\uFEFF'; // Excel UTF-8 BOM

        // 1. LOANS SECTION
        const loanRows = (loans || []).map(l => ({
            ID: l.id,
            Date: new Date(l.request_date).toLocaleDateString('fr-FR'),
            Client: `${l.user?.prenom} ${l.user?.nom}`,
            Email: l.user?.email,
            Montant: l.amount,
            Paye: l.amount_paid,
            Status: l.status,
            Echeance: l.due_date,
            Reseau: l.payout_network,
            Numero: l.payout_phone
        }))
        csvContent += formatSection('Rapport des Prets', ['Date', 'Client', 'Email', 'Montant', 'Paye', 'Status', 'Echeance', 'Reseau', 'Numero'], loanRows)

        // 2. REPAYMENTS SECTION
        const repaymentRows = (repayments || []).map(r => ({
            Date: new Date(r.created_at).toLocaleDateString('fr-FR'),
            Client: `${r.user?.prenom} ${r.user?.nom}`,
            Email: r.user?.email,
            Somme_Declaree: r.amount_declared,
            Status: r.status,
            Date_Validation: r.validated_at ? new Date(r.validated_at).toLocaleDateString('fr-FR') : '-'
        }))
        csvContent += formatSection('Rapport des Remboursements', ['Date', 'Client', 'Email', 'Somme_Declaree', 'Status', 'Date_Validation'], repaymentRows)

        // 3. SUBSCRIPTIONS SECTION
        const subRows = (subscriptions || []).map(s => ({
            Date: new Date(s.created_at).toLocaleDateString('fr-FR'),
            Client: `${s.user?.prenom} ${s.user?.nom}`,
            Forfait: s.plan?.name,
            Prix: s.plan?.price,
            Status: s.status,
            Paiement: s.amount_paid
        }))
        csvContent += formatSection('Rapport des Abonnements', ['Date', 'Client', 'Forfait', 'Prix', 'Status', 'Paiement'], subRows)

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename=creditly_rapport_complet_${new Date().toISOString().split('T')[0]}.csv`,
            },
        })

    } catch (e) {
        console.error('Export error:', e)
        return NextResponse.json({ error: 'Unauthorized or Export failed' }, { status: 401 })
    }
}
