const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: 'postgresql://humory_user:humory_password@localhost:5432/humory_dev',
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to database');

    const sql = fs.readFileSync('/home/ubuntu/humory/packages/backend/src/db/migrations/003_add_certificate_options.sql', 'utf8');

    await client.query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
