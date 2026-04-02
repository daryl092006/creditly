import { createAdminClient } from './utils/supabase/server'

async function checkAdmins() {
    const supabase = await createAdminClient()
    const { data: admins } = await supabase.from('users').select('id, roles, prenom, nom')

    console.log("All users roles:");
    admins?.forEach(a => console.log(a.prenom, a.roles));
}

checkAdmins()
