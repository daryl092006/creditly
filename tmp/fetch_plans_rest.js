
const https = require('https');
const fs = require('fs');

const url = 'https://dbunwqgfakqcazjkyagd.supabase.co/rest/v1/abonnements?select=id,name,max_loan_amount';
const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';

const options = {
  headers: {
    'apikey': apikey,
    'Authorization': `Bearer ${apikey}`
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync('d:/creditly/tmp/plans_output.json', data);
    console.log('Saved to d:/creditly/tmp/plans_output.json');
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
