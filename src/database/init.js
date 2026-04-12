import dotenv from 'dotenv';
import { runMigrations } from './migrations.js';

dotenv.config();

/**
 * Available buildings templates that users can purchase
 * These are not added to users by default, but available for purchase
 * Production rates are per HOUR
 */
export const AVAILABLE_BUILDINGS = [
  { type: 'mine', maxCount: 5, productionRate: 80, baseCost: 0 }, // First mine is free
  { type: 'quarry', maxCount: 5, productionRate: 60, baseCost: 50000 },
  { type: 'lumber_mill', maxCount: 5, productionRate: 50, baseCost: 40000 },
  { type: 'farm', maxCount: 5, productionRate: 40, baseCost: 30000 },
];

/**
 * Initial user resources
 */
export const INITIAL_USER_RESOURCES = {
  gold: 5000,
  wood: 2500,
  stone: 2500,
  meat: 500,
  jabcoins: 0,
};

/**
 * Initialize database tables and run migrations
 * Automatically creates tables and adds missing columns if they don't exist
 * Data is never lost - all migrations use DEFAULT values to preserve existing data
 */
export async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...');
    const result = await runMigrations();

    if (result.success) {
      console.log('✅ Database initialization completed successfully!');
      console.log(`   Migrations run: ${result.migrationsRun}`);
      if (result.warnings > 0) {
        console.log(
          `   (${result.warnings} operations skipped - normal for existing databases)`
        );
      }
    } else {
      console.error('❌ Database initialization failed:', result.error);
      console.log('Continuing anyway - will retry on next startup');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    console.log('Continuing anyway - will retry on next startup');
  }
}
