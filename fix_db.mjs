import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    const q1 = "ALTER TABLE tax_profiles DROP CONSTRAINT IF EXISTS tax_profiles_user_id_key;";
    const q2 = "ALTER TABLE tax_profiles ADD CONSTRAINT tax_profiles_user_id_key UNIQUE (user_id);";
    await sql.unsafe(q1);
    await sql.unsafe(q2);
    console.log("Migration successful!");
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
run();
