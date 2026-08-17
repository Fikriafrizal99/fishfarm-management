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

  `DO $$
   BEGIN
     ALTER TABLE leads
       ADD CONSTRAINT lead_expected_demand_positive CHECK (expected_demand_kg IS NULL OR expected_demand_kg > 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE leads
       ADD CONSTRAINT lead_expected_price_positive CHECK (expected_price_per_kg IS NULL OR expected_price_per_kg > 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE sales_opportunities
       ADD CONSTRAINT opportunity_qty_positive CHECK (expected_qty_kg IS NULL OR expected_qty_kg > 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE sales_opportunities
       ADD CONSTRAINT opportunity_price_positive CHECK (expected_price_per_kg IS NULL OR expected_price_per_kg > 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE customer_interactions
       ADD CONSTRAINT interaction_target_required
       CHECK (customer_id IS NOT NULL OR lead_id IS NOT NULL OR opportunity_id IS NOT NULL);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE sales_order_items
       ADD CONSTRAINT sales_order_item_quantity_positive CHECK (quantity_kg > 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE sales_order_items
       ADD CONSTRAINT sales_order_item_price_positive CHECK (unit_price_per_kg > 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE harvest_lots
       ADD CONSTRAINT harvest_lot_quantity_positive CHECK (quantity_kg > 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE fulfillment_allocations
       ADD CONSTRAINT fulfillment_allocation_positive CHECK (allocated_kg > 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE delivery_items
       ADD CONSTRAINT delivery_item_quantity_positive CHECK (quantity_kg > 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE invoices
       ADD CONSTRAINT invoice_subtotal_nonnegative CHECK (subtotal_amount >= 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE invoices
       ADD CONSTRAINT invoice_total_nonnegative CHECK (total_amount >= 0);
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,

  `DO $$
   BEGIN
     ALTER TABLE payments
       ADD CONSTRAINT payment_amount_positive CHECK (amount > 0);
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
