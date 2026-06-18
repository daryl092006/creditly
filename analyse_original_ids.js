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
    console.log("Analyzing prets validators...");
    const { data: prets } = await supabase.from('prets').select('id, admin_id, first_validated_by, second_validated_by');
    
    const countFirstHabib = prets.filter(p => p.first_validated_by === HABIB_ID).length;
    const countSecondHabib = prets.filter(p => p.second_validated_by === HABIB_ID).length;
    const countAdminHabib = prets.filter(p => p.admin_id === HABIB_ID).length;

    console.log(`Prets:`);
    console.log(`- first_validated_by is Habib: ${countFirstHabib}`);
    console.log(`- second_validated_by is Habib: ${countSecondHabib}`);
    console.log(`- admin_id is Habib: ${countAdminHabib}`);

    console.log("\nAnalyzing remboursements validators...");
    const { data: rembs } = await supabase.from('remboursements').select('id, admin_id, first_validated_by, second_validated_by');
    const countFirstHabibR = rembs.filter(r => r.first_validated_by === HABIB_ID).length;
    const countSecondHabibR = rembs.filter(r => r.second_validated_by === HABIB_ID).length;
    const countAdminHabibR = rembs.filter(r => r.admin_id === HABIB_ID).length;

    console.log(`Remboursements:`);
    console.log(`- first_validated_by is Habib: ${countFirstHabibR}`);
    console.log(`- second_validated_by is Habib: ${countSecondHabibR}`);
    console.log(`- admin_id is Habib: ${countAdminHabibR}`);
}

run();
