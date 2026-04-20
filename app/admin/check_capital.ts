import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function check() {
  const { data: loans } = await supabase.from('prets').select('amount, amount_paid').in('status', ['active', 'overdue'])
  const capitalOut = loans?.reduce((acc, l) => acc + (Number(l.amount) - Number(l.amount_paid)), 0) || 0
  console.log('CAPITAL_OUT:', capitalOut)
}
check()
