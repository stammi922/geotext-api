'use client';

import { Check } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';

export default function PricingPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: 'starter' | 'pro') => {
    if (!user?.emailAddresses[0]?.emailAddress) {
      // Redirect to sign in
      window.location.href = '/sign-in';
      return;
    }

    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          email: user.emailAddresses[0].emailAddress,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        alert('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to create checkout session');
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'Forever',
      description: 'Great for testing and small projects',
      requests: '100 requests/month',
      features: [
        'Multi-source geocoding',
        'Location extraction API',
        'Email support',
      ],
      cta: 'Get Started',
      highlighted: false,
    },
    {
      name: 'Starter',
      price: '$29',
      period: '/month',
      description: 'For growing projects',
      requests: '10,000 requests/month',
      features: [
        'Everything in Free',
        '10K requests/month',
        'Priority support',
        'Usage analytics',
        'API documentation',
        'Rate limiting: 100 req/min',
      ],
      cta: 'Subscribe Now',
      highlighted: true,
    },
    {
      name: 'Pro',
      price: '$99',
      period: '/month',
      description: 'For production applications',
      requests: '100,000 requests/month',
      features: [
        'Everything in Starter',
        '100K requests/month',
        '24/7 priority support',
        'Advanced analytics',
        'Webhook events',
        'Rate limiting: 1000 req/min',
        'SLA: 99.9% uptime',
      ],
      cta: 'Subscribe Now',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-slate-900">Simple, Transparent Pricing</h1>
          <p className="mt-4 text-xl text-slate-600">Pay only for what you use. Cancel anytime.</p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border-2 p-8 flex flex-col ${
                plan.highlighted
                  ? 'border-blue-600 bg-blue-50 shadow-lg scale-105'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {plan.highlighted && (
                <div className="mb-4 inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold w-fit">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
              <p className="mt-2 text-slate-600 text-sm">{plan.description}</p>

              <div className="mt-6 mb-6">
                <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-slate-600 ml-2">{plan.period}</span>
              </div>

              <div className="mb-6 p-3 bg-slate-100 rounded-lg text-center">
                <p className="font-semibold text-slate-900">{plan.requests}</p>
              </div>

              {plan.name === 'Free' ? (
                <button
                  onClick={() => (window.location.href = '/sign-in')}
                  className={`w-full px-4 py-3 rounded-lg font-semibold transition mb-8 ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  Get Started
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.name.toLowerCase() as 'starter' | 'pro')}
                  disabled={loading === plan.name.toLowerCase()}
                  className={`w-full px-4 py-3 rounded-lg font-semibold transition mb-8 ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:bg-slate-50'
                  }`}
                >
                  {loading === plan.name.toLowerCase() ? 'Loading...' : plan.cta}
                </button>
              )}

              <div className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-slate-700 text-sm">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Frequently Asked Questions</h2>

        <div className="space-y-6">
          {[
            {
              q: 'Do you offer a free trial?',
              a: 'Yes, our Free plan includes 100 requests/month so you can test the API without a credit card.',
            },
            {
              q: 'Can I upgrade or downgrade anytime?',
              a: 'Yes, you can change your plan at any time. Changes take effect immediately.',
            },
            {
              q: 'What payment methods do you accept?',
              a: 'We accept all major credit cards via Stripe. Monthly billing only.',
            },
            {
              q: 'Do you offer discounts for annual billing?',
              a: 'Contact us at support@geotext-api.com for bulk pricing and enterprise plans.',
            },
            {
              q: 'What happens when I exceed my request limit?',
              a: 'We will notify you when you reach 80% of your monthly limit. Requests are rejected after exceeding your plan limit.',
            },
          ].map((item, i) => (
            <details
              key={i}
              className="p-4 border border-slate-200 rounded-lg group cursor-pointer hover:bg-slate-50"
            >
              <summary className="font-semibold text-slate-900 flex items-center justify-between">
                {item.q}
                <span className="text-slate-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
