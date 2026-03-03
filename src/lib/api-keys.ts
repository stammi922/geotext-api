import { createHash } from 'crypto';
import { sql } from '@vercel/postgres';

const API_KEY_PREFIX = process.env.API_KEY_PREFIX || 'geotext_live_';
const KEY_LENGTH = 32; // 32 random bytes

/**
 * Generate a new API key
 * Format: geotext_live_[32 random chars]
 */
export function generateApiKey(): string {
  const randomBytes = require('crypto').randomBytes(KEY_LENGTH).toString('hex');
  return `${API_KEY_PREFIX}${randomBytes}`;
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Get key prefix (first 16 chars of key, used for display)
 */
export function getKeyPrefix(key: string): string {
  return key.substring(0, 16) + '...';
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(
  userId: number,
  name: string = 'Default Key'
) {
  try {
    const key = generateApiKey();
    const keyHash = hashApiKey(key);
    const keyPrefix = key.substring(0, 16);

    const result = await sql`
      INSERT INTO api_keys (user_id, key_hash, key_prefix, name)
      VALUES (${userId}, ${keyHash}, ${keyPrefix}, ${name})
      RETURNING id, key_prefix, created_at, name
    `;

    // Return both the key (only shown once) and the database record
    return {
      key, // Full key - only shown at creation
      ...result.rows[0],
    };
  } catch (error) {
    console.error('Error creating API key:', error);
    throw error;
  }
}

/**
 * Validate an API key
 * Returns user_id if valid, null if invalid
 */
export async function validateApiKey(key: string): Promise<number | null> {
  try {
    const keyHash = hashApiKey(key);

    const result = await sql`
      SELECT user_id FROM api_keys
      WHERE key_hash = ${keyHash} AND revoked_at IS NULL
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].user_id;
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

/**
 * List API keys for a user
 */
export async function listApiKeys(userId: number) {
  try {
    const result = await sql`
      SELECT id, key_prefix, name, created_at, revoked_at
      FROM api_keys
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return result.rows;
  } catch (error) {
    console.error('Error listing API keys:', error);
    throw error;
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: number, userId: number) {
  try {
    const result = await sql`
      UPDATE api_keys
      SET revoked_at = NOW()
      WHERE id = ${keyId} AND user_id = ${userId}
      RETURNING id, revoked_at
    `;

    if (result.rows.length === 0) {
      throw new Error('Key not found or unauthorized');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error revoking API key:', error);
    throw error;
  }
}
