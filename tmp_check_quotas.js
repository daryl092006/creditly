const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkQuotas() {
    try {
        const envPath = path.join(process.cwd(), '.env.local');
        const content = fs.readFileSync(envPath, 'utf8');
        const env = {};
        content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#')).forEach(line => {
            const index = line.indexOf('=');
            if (index > -1) {
                const key = line.substring(0, index).trim();
                const value = line.substring(index + 1).trim().replace(/^["']|["']$/g, '');
                env[key] = value;
            }
        });

        const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        console.log('Checking global_quotas table...');
        const { data, error } = await supabase.from('global_quotas').select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('Error checking global_quotas:', error.message);
            if (error.code === 'PGRST116' || error.message.includes('relation "public.global_quotas" does not exist')) {
                console.log('The table global_quotas does not exist!');
            }
        } else {
            console.log('Table global_quotas exists. Row count:', data);
        }

        console.log('Checking abonnements table...');
        const { data: plans, error: planError } = await supabase.from('abonnements').select('id, name');
        if (planError) {
            console.error('Error checking abonnements:', planError.message);
        } else {
            console.log('Plans found:', plans.length);
            plans.forEach(p => console.log(`- ${p.name} (${p.id})`));
        }

    } catch (e) {
        console.error('Global Error:', e.message);
    }
}

checkQuotas();
