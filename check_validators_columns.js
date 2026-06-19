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

const DENIS_ID = '02407183-6552-4b79-abea-b7066cb475e8';
const HABIB_ID = '1d43cfbc-3084-4b93-9f10-0f9bcb174e5e';
const BOREL_ID = '8a145083-6340-49c8-a7ca-1b49fe07ad93';
const WILFRIED_ID = 'c1a7232c-6dd6-4a12-ba3f-0a0fdb1c4327';

async function run() {
    // 1. Check prets
    const { data: prets } = await supabase.from('prets').select('id, admin_id, first_validated_by, second_validated_by');
    
    console.log("=== Prets Validator Columns ===");
    const pretStats = { first: {}, second: {} };
    prets?.forEach(p => {
        pretStats.first[p.first_validated_by] = (pretStats.first[p.first_validated_by] || 0) + 1;
        pretStats.second[p.second_validated_by] = (pretStats.second[p.second_validated_by] || 0) + 1;
    });
    console.log("first_validated_by distribution:", pretStats.first);
    console.log("second_validated_by distribution:", pretStats.second);

    // 2. Check remboursements
    const { data: rembs } = await supabase.from('remboursements').select('id, admin_id, first_validated_by, second_validated_by');
    
    console.log("\n=== Remboursements Validator Columns ===");
    const rembStats = { first: {}, second: {} };
    rembs?.forEach(r => {
        rembStats.first[r.first_validated_by] = (rembStats.first[r.first_validated_by] || 0) + 1;
        rembStats.second[r.second_validated_by] = (rembStats.second[r.second_validated_by] || 0) + 1;
    });
    console.log("first_validated_by distribution:", rembStats.first);
    console.log("second_validated_by distribution:", rembStats.second);
}

run();
