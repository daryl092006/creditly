console.log('Starting script...');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sqlFile = path.resolve(__dirname, '..', 'supabase', 'migrations', '20260522_fix_risk_class_enum.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

const client = new Client({
  connectionString: "postgresql://postgres.dbunwqgfakqcazjkyagd:creditly_db_password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" 
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to PG');
    const res = await client.query(sql);
    console.log('Success!');
  } catch (err) {
    console.error('SQL Error Message:', err.message);
  } finally {
    await client.end();
  }
}

run();
