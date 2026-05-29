import { createClient } from './utils/supabase/server'

async function backfillValidatedAt() {
    const supabase = await createClient()
    
    console.log("Backfilling validated_at for repayments...")
    
    // Find repayments where status is verified or rejected but validated_at is null
    const { data: repayments } = await supabase
        .from('remboursements')
        .select('id, updated_at, status')
        .in('status', ['verified', 'rejected'])
        .is('validated_at', null)
    
    if (!repayments || repayments.length === 0) {
        console.log("No repayments to backfill.")
        return
    }
    
    console.log(`Found ${repayments.length} repayments to update.`)
    
    for (const r of repayments) {
        const { error } = await supabase
            .from('remboursements')
            .update({ validated_at: r.updated_at })
            .eq('id', r.id)
        
        if (error) console.error(`Error updating ${r.id}:`, error)
    }
    
    console.log("Backfill complete.")
}

backfillValidatedAt()
