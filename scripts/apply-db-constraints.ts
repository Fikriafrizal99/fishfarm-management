import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to apply database constraints");
}

const pool = new Pool({ connectionString });

const statements = [
  `CREATE UNIQUE INDEX IF NOT EXISTS production_cycle_one_open_cycle_per_pond
   ON production_cycles (pond_id)
   WHERE status IN ('ACTIVE', 'HARVESTING')`,

  `DO $$
   BEGIN
     ALTER TABLE sampling_logs
       ADD CONSTRAINT sampling_weight_required
       CHECK (total_sample_weight_kg IS NOT NULL OR average_weight_g IS NOT NULL);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE stockings
       ADD CONSTRAINT stocking_quantity_positive CHECK (quantity > 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE feeding_logs
       ADD CONSTRAINT feeding_quantity_positive CHECK (quantity_kg > 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE mortality_logs
       ADD CONSTRAINT mortality_quantity_positive CHECK (quantity > 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE sampling_logs
       ADD CONSTRAINT sampling_count_positive CHECK (sample_count > 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE expenses
       ADD CONSTRAINT expense_amount_nonnegative CHECK (amount >= 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE harvests
       ADD CONSTRAINT harvest_weight_positive CHECK (weight_kg > 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE harvests
       ADD CONSTRAINT harvest_price_nonnegative CHECK (selling_price_per_kg >= 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,
];

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query("COMMIT");
    console.log(`Applied ${statements.length} development database constraints.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
