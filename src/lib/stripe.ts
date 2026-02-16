import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {});

export const PLANS = {
  free: {
    name: 'Free',
    priceId: null, // Free tier, no Stripe product
    requests: 100,
    monthlyPrice: 0,
  },
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    requests: 10000,
    monthlyPrice: 2900, // $29 in cents
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    requests: 100000,
    monthlyPrice: 9900, // $99 in cents
  },
};

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  plan: 'starter' | 'pro'
) {
  const planConfig = PLANS[plan];

  if (!planConfig.priceId) {
    throw new Error(`Invalid plan: ${plan}`);
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    client_reference_id: userId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      {
        price: planConfig.priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
    metadata: {
      userId,
      plan,
    },
  });

  return session;
}

/**
 * Get customer portal URL for managing subscription
 */
export async function getCustomerPortalUrl(
  stripeCustomerId: string,
  returnUrl: string
) {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Handle webhook events from Stripe
 */
export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      // Update user's plan in database
      const subscription = event.data.object as Stripe.Subscription;
      console.log('Subscription event:', subscription.id, subscription.status);
      // TODO: Update user plan in database
      break;

    case 'customer.subscription.deleted':
      // Downgrade user to free plan
      const deletedSub = event.data.object as Stripe.Subscription;
      console.log('Subscription deleted:', deletedSub.id);
      // TODO: Downgrade user to free plan
      break;

    case 'charge.failed':
      // Notify user of failed payment
      console.log('Charge failed:', event.data.object);
      break;

    default:
      console.log('Unhandled webhook event:', event.type);
  }
}
