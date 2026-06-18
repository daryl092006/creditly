const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let supabaseUrl = '';
let supabaseKey = '';

try {
    const dotenvContent = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    dotenvContent.split(/\r?\n/).forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^"|"$)/g, '');
        }
    });
    supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
} catch (e) {
    console.error("Error reading .env.local", e);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BOREL_ID = '8a145083-6340-49c8-a7ca-1b49fe07ad93';
const WILFRIED_ID = 'c1a7232c-6dd6-4a12-ba3f-0a0fdb1c4327';

async function run() {
    console.log("Searching audit_logs...");
    
    const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .or(`old_value_json.toString().ilike.%${BOREL_ID}%,new_value_json.toString().ilike.%${BOREL_ID}%,old_value_json.toString().ilike.%${WILFRIED_ID}%,new_value_json.toString().ilike.%${WILFRIED_ID}%`)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        // Fallback: check if audit_logs exists and has rows
        console.error("Audit log query error:", error);
        
        const { data: allLogs, error: allErr } = await supabase
            .from('audit_logs')
            .select('id, action_type, target_table, created_at')
            .order('created_at', { ascending: false })
            .limit(20);
            
        if (allErr) {
            console.error("Error listing all audit logs:", allErr);
        } else {
            console.log("All recent audit logs:", allLogs);
        }
    } else {
        console.log(`Found ${logs.length} matching audit logs.`);
        logs.forEach(log => {
            console.log(`- Log: ${log.created_at} | Action: ${log.action_type} | Table: ${log.target_table} | Target ID: ${log.target_id}`);
            console.log(`  Old: ${JSON.stringify(log.old_value_json)}`);
            console.log(`  New: ${JSON.stringify(log.new_value_json)}`);
        });
    }
}

run();
