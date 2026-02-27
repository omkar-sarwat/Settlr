#!/usr/bin/env node
/**
 * Database migration runner (Node.js fallback when psql is not available)
 * Usage: node migrate.js <migration-file.sql>
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration(sqlFile) {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        await client.query(sqlContent);
        console.log('  [OK] Success');
        process.exit(0);
    } catch (err) {
        console.error('  [ERROR] Migration failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
}
}

const sqlFile = process.argv[2];
if (!sqlFile) {
    console.error('Usage: node migrate.js <migration-file.sql>');
    process.exit(1);
}

runMigration(sqlFile);
