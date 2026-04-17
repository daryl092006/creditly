
import { createAdminClient } from './utils/supabase/server'

async function checkSubSchema() {
    const supabase = await createAdminClient()
    const { data, error } = await supabase.from('user_subscriptions').select('*').limit(1)
    if (error) {
        console.error('Error fetching user_subscriptions:', error)
        return
    }
    console.log('Columns in user_subscriptions:', Object.keys(data[0] || {}))
}

checkSubSchema()
