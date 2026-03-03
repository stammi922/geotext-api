import { Readable } from 'stream';
import Stripe from 'stripe';
import { handleWebhookEvent } from '@/lib/stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

async function buffer(readable: Readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 */
export async function POST(req: Request) {
  const body = await buffer(req.body as any);
  const sig = req.headers.get('stripe-signature');

  if (!sig || !webhookSecret) {
    return new Response('Webhook signature missing', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  try {
    await handleWebhookEvent(event);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return new Response(`Webhook handler error: ${error.message}`, {
      status: 500,
    });
  }
}
