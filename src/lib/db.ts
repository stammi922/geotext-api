import { sql } from '@vercel/postgres';

/**
 * Initialize database schema
 * Call this once during deployment to set up tables
 */
export async function initializeDatabase() {
  try {
    // Users table: stores Clerk users
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        clerk_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
    `;

    // API Keys table: stores hashed keys for validation
    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        key_hash VARCHAR(255) NOT NULL UNIQUE,
        key_prefix VARCHAR(20) NOT NULL,
        name VARCHAR(255) DEFAULT 'Default Key',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP,
        CONSTRAINT fk_api_keys_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
    `;

    // Usage table: tracks API requests
    await sql`
      CREATE TABLE IF NOT EXISTS usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        api_key_id INTEGER REFERENCES api_keys(id),
        endpoint VARCHAR(255) NOT NULL,
        requests INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_usage_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage(user_id);
      CREATE INDEX IF NOT EXISTS idx_usage_created_at ON usage(created_at);
    `;

    console.log('✅ Database schema initialized');
  } catch (error: any) {
    // Table already exists errors are fine
    if (!error.message.includes('already exists')) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }
}

/**
 * Get or create user from Clerk ID
 */
export async function getOrCreateUser(clerkId: string, email: string) {
  try {
    // Check if user exists
    const existing = await sql`
      SELECT * FROM users WHERE clerk_id = ${clerkId}
    `;

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new user
    const result = await sql`
      INSERT INTO users (clerk_id, email)
      VALUES (${clerkId}, ${email})
      RETURNING *
    `;

    return result.rows[0];
  } catch (error) {
    console.error('Error getting/creating user:', error);
    throw error;
  }
}

/**
 * Record API usage
 */
export async function recordUsage(
  userId: number,
  apiKeyId: number | null,
  endpoint: string
) {
  try {
    await sql`
      INSERT INTO usage (user_id, api_key_id, endpoint, requests)
      VALUES (${userId}, ${apiKeyId}, ${endpoint}, 1)
      ON CONFLICT (user_id, api_key_id, endpoint, created_at)
      DO UPDATE SET requests = requests + 1
    `;
  } catch (error) {
    console.error('Error recording usage:', error);
    // Don't throw - usage tracking should not break the API
  }
}
