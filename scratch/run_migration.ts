/**
 * Script d'exécution de la migration SQL Risk Mitigation System
 * Usage: npx tsx scratch/run_migration.ts
 * 
 * Ce script charge .env.local et exécute le fichier SQL de migration
 * via l'API REST Supabase (service_role).
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Charger les variables d'environnement depuis .env.local
const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join('=').trim().replace(/\r$/, '');
    }
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Variables manquantes: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

// Lire le fichier SQL de migration
const sqlPath = join(process.cwd(), 'supabase', 'migrations', '20260520_risk_mitigation_system.sql');
const sql = readFileSync(sqlPath, 'utf-8');

// Découper le SQL en statements individuels (séparés par ;)
// On regroupe les blocs DO $$ ... $$ ensemble
function splitSQLStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = '';
    let inDollarBlock = false;
    let dollarTag = '';

    const lines = sql.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        // Détecter le début d'un bloc dollar
        if (!inDollarBlock && (trimmed.startsWith('DO $$') || trimmed.startsWith('DO $') || trimmed === '$$' || trimmed.includes('$$ BEGIN'))) {
            inDollarBlock = true;
        }
        current += line + '\n';
        // Détecter fin de bloc dollar
        if (inDollarBlock && (trimmed.endsWith('$$;') || trimmed === '$$ LANGUAGE plpgsql SECURITY DEFINER;' || trimmed.endsWith('$$ LANGUAGE plpgsql;'))) {
            inDollarBlock = false;
            statements.push(current.trim());
            current = '';
            continue;
        }
        // Si pas dans un bloc dollar et que la ligne se termine par ;
        if (!inDollarBlock && trimmed.endsWith(';') && !trimmed.startsWith('--')) {
            statements.push(current.trim());
            current = '';
        }
    }
    if (current.trim()) {
        statements.push(current.trim());
    }
    return statements.filter(s => s && !s.startsWith('--') && s.trim().length > 3);
}

async function executeSQLViaRPC(sqlStatement: string): Promise<void> {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ sql: sqlStatement })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
    }
}

async function executeSQLDirect(sqlStatement: string): Promise<{ success: boolean; error?: string }> {
    // Utiliser l'API PostgreSQL REST directement via Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: sqlStatement })
    });

    return { success: response.ok };
}

// Approche alternative: utiliser fetch vers le endpoint pg-meta de Supabase
async function runMigrationViaFetch(sql: string): Promise<void> {
    console.log('🔗 Connexion à Supabase:', SUPABASE_URL);
    
    // Extraire le project ref depuis l'URL
    const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
    
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql })
    });

    const result = await response.json() as any;
    if (!response.ok) {
        throw new Error(`API Error: ${JSON.stringify(result)}`);
    }
    console.log('✅ Migration exécutée avec succès via API Supabase');
}

// Méthode principale: via le client @supabase/supabase-js
async function runMigrationViaSupabaseClient(): Promise<void> {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    console.log('🔗 Connexion Supabase établie:', SUPABASE_URL);
    
    // Tester la connexion
    const { data: testData, error: testError } = await supabase.from('users').select('id').limit(1);
    if (testError) {
        console.error('❌ Erreur de connexion:', testError.message);
        process.exit(1);
    }
    console.log('✅ Connexion réussie.');

    // Exécuter le SQL entier en une seule fois via rpc si disponible
    console.log('📦 Tentative d\'exécution via la fonction exec_sql...');
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql });
    
    if (rpcError) {
        console.log('ℹ️  La fonction exec_sql n\'existe pas, exécution impossible côté RPC.');
        console.log('📋 Veuillez copier et exécuter le SQL dans le Tableau de Bord Supabase:');
        console.log('   → https://supabase.com/dashboard/project/' + SUPABASE_URL.replace('https://', '').split('.')[0] + '/sql/new');
        console.log('\n--- SQL À EXÉCUTER DANS SUPABASE SQL EDITOR ---\n');
        console.log(sql);
        return;
    }
    
    console.log('✅ Migration exécutée avec succès!');
}

runMigrationViaSupabaseClient().catch(err => {
    console.error('❌ Erreur fatale:', err.message);
    console.log('\n📋 Veuillez copier et exécuter manuellement dans Supabase SQL Editor:\n');
    console.log(sql.substring(0, 500) + '...');
});
