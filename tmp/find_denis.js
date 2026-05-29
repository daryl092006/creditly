import { createClient } from './utils/supabase/server'

async function findDenis() {
    const supabase = await createClient()
    const { data: users } = await supabase.from('users').select('id, nom, prenom, email').ilike('email', '%denis%')
    console.log(JSON.stringify(users, null, 2))
}

findDenis()
