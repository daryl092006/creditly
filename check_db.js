const fs = require('fs');

async function run() {
    try {
        const content = fs.readFileSync('.env.local', 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const index = line.indexOf('=');
            if (index > -1) {
                const key = line.substring(0, index).trim();
                const value = line.substring(index + 1).trim().replace(/^["']|["']$/g, '');
                env[key] = value;
            }
        });

        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        const { count: pendingCount } = await supabase.from('kyc_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { data: rawData } = await supabase.from('kyc_submissions').select('*').eq('status', 'pending');
        const { data: joinedData } = await supabase.from('kyc_submissions').select('*, user:users(*)').eq('status', 'pending');
        
        const results = {
            pendingCount,
            rawDataLength: rawData ? rawData.length : 0,
            joinedDataLength: joinedData ? joinedData.length : 0,
            orphans: []
        };

        if (rawData) {
            for (const sub of rawData) {
                const { data: user } = await supabase.from('users').select('*').eq('id', sub.user_id).single();
                if (!user) {
                    results.orphans.push({ submission_id: sub.id, user_id: sub.user_id });
                }
            }
        }

        fs.writeFileSync('debug.json', JSON.stringify(results, null, 2));
        console.log('Results written to debug.json');
    } catch (e) {
        fs.writeFileSync('debug.json', JSON.stringify({ error: e.message, stack: e.stack }, null, 2));
        console.log('Error:', e.message);
    }
}

run();
