import { auth } from '@clerk/nextjs/server';
import { createCheckoutSession } from '@/lib/stripe';

/**
 * POST /api/stripe/checkout
 * Create a Stripe checkout session for subscription upgrade
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
    const { plan, email } = body;

    if (!plan || !email) {
      return new Response(JSON.stringify({ error: 'Missing plan or email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!['starter', 'pro'].includes(plan)) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = await createCheckoutSession(userId, email, plan);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
