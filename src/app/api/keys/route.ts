import { auth } from '@clerk/nextjs/server';
import { getOrCreateUser, recordUsage } from '@/lib/db';
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from '@/lib/api-keys';

/**
 * GET /api/keys
 * List all API keys for the current user
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get or create user in database
    const user = await getOrCreateUser(userId, ''); // Email not available in middleware

    // List keys
    const keys = await listApiKeys(user.id);

    // Record usage
    await recordUsage(user.id, null, '/api/keys');

    return new Response(JSON.stringify({ keys }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('GET /api/keys error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * POST /api/keys
 * Create a new API key
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { name } = body;

    // Get or create user in database
    const user = await getOrCreateUser(userId, '');

    // Create key
    const newKey = await createApiKey(user.id, name || 'API Key');

    // Record usage
    await recordUsage(user.id, null, 'POST /api/keys');

    // Return the key only on creation (never shown again)
    return new Response(JSON.stringify({ key: newKey }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('POST /api/keys error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * DELETE /api/keys/:id
 * Revoke an API key
 */
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing key id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get or create user in database
    const user = await getOrCreateUser(userId, '');

    // Revoke key
    const revoked = await revokeApiKey(id, user.id);

    // Record usage
    await recordUsage(user.id, null, 'DELETE /api/keys');

    return new Response(JSON.stringify({ revoked }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('DELETE /api/keys error:', error);

    if (error.message === 'Key not found or unauthorized') {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
