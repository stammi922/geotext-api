import { auth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import { getOrCreateUser } from '@/lib/db';

/**
 * GET /api/analytics
 * Get usage analytics for the current user
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
    const user = await getOrCreateUser(userId, '');

    // Get total requests this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalRes = await sql`
      SELECT COUNT(*) as total_requests
      FROM usage
      WHERE user_id = ${user.id}
      AND created_at >= ${monthStart.toISOString()}
    `;

    const totalRequests = totalRes.rows[0]?.total_requests || 0;

    // Get requests by day (last 30 days)
    const dailyRes = await sql`
      SELECT DATE(created_at) as date, SUM(requests) as requests
      FROM usage
      WHERE user_id = ${user.id}
      AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Get top endpoints
    const endpointsRes = await sql`
      SELECT endpoint, SUM(requests) as requests
      FROM usage
      WHERE user_id = ${user.id}
      AND created_at >= ${monthStart.toISOString()}
      GROUP BY endpoint
      ORDER BY requests DESC
      LIMIT 10
    `;

    // Get active API keys
    const keysRes = await sql`
      SELECT COUNT(*) as active_keys
      FROM api_keys
      WHERE user_id = ${user.id}
      AND revoked_at IS NULL
    `;

    const activeKeys = keysRes.rows[0]?.active_keys || 0;

    // Calculate plan info
    const plan =
      totalRequests > 100000
        ? { name: 'Pro', limit: 100000 }
        : totalRequests > 10000
          ? { name: 'Starter', limit: 10000 }
          : { name: 'Free', limit: 100 };

    return new Response(
      JSON.stringify({
        total_requests: parseInt(totalRequests),
        requests_this_month: parseInt(totalRequests),
        active_keys: activeKeys,
        plan: plan.name,
        plan_limit: plan.limit,
        usage_percentage: Math.round((totalRequests / plan.limit) * 100),
        daily_requests: dailyRes.rows.map((row: any) => ({
          date: row.date,
          requests: parseInt(row.requests || 0),
        })),
        top_endpoints: endpointsRes.rows.map((row: any) => ({
          endpoint: row.endpoint,
          requests: parseInt(row.requests || 0),
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('GET /api/analytics error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
