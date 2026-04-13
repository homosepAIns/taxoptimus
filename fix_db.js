import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
async function run() {
  // Wait, RPC is not available unless I have an exec_sql function or something.
  // I can just add it to supabase/migrations or maybe supabase is not being used locally?
}
