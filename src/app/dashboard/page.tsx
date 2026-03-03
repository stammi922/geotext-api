'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Copy, Trash2, Plus, Eye, EyeOff } from 'lucide-react';

interface ApiKey {
  id: number;
  key_prefix: string;
  name: string;
  created_at: string;
  revoked_at: string | null;
}

interface NewKeyResponse {
  key: {
    key: string;
    id: number;
    key_prefix: string;
    created_at: string;
    name: string;
  };
}

interface Analytics {
  total_requests: number;
  requests_this_month: number;
  active_keys: number;
  plan: string;
  plan_limit: number;
  usage_percentage: number;
  daily_requests: Array<{ date: string; requests: number }>;
  top_endpoints: Array<{ endpoint: string; requests: number }>;
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [keyName, setKeyName] = useState('');
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  // Fetch API keys and analytics
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [keysRes, analyticsRes] = await Promise.all([
          fetch('/api/keys'),
          fetch('/api/analytics'),
        ]);

        if (keysRes.ok) {
          const data = await keysRes.json();
          setKeys(data.keys || []);
        } else if (keysRes.status === 401) {
          router.push('/sign-in');
        }

        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, router]);

  const createNewKey = async () => {
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName || 'API Key' }),
      });

      if (res.ok) {
        const data: NewKeyResponse = await res.json();
        setNewKey(data.key.key);
        setShowNewKeyModal(false);
        setKeyName('');

        // Refresh keys list
        const keysRes = await fetch('/api/keys');
        if (keysRes.ok) {
          const keysData = await keysRes.json();
          setKeys(keysData.keys || []);
        }
      }
    } catch (error) {
      console.error('Failed to create key:', error);
    }
  };

  const deleteKey = async (id: number) => {
    try {
      const res = await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setKeys(keys.filter((k) => k.id !== id));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Failed to delete key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
              <p className="mt-2 text-slate-600">Welcome, {user?.emailAddresses[0]?.emailAddress}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/pricing')}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Pricing
              </button>
              <button
                onClick={() => router.push('/docs')}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Docs
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* New Key Modal */}
        {newKey && (
          <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-4">API Key Created!</h3>
            <p className="text-green-800 mb-4">Save this key somewhere safe. You won't see it again.</p>
            <div className="bg-white p-4 rounded border border-green-300 font-mono text-sm mb-4">
              <div className="flex items-center justify-between">
                <code className="text-slate-900 break-all">{newKey}</code>
                <button
                  onClick={() => copyToClipboard(newKey)}
                  className="ml-4 p-2 hover:bg-slate-100 rounded transition"
                >
                  {copied ? (
                    <span className="text-green-600 text-sm">Copied!</span>
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Done
            </button>
          </div>
        )}

        {/* API Keys Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">API Keys</h2>
            <button
              onClick={() => setShowNewKeyModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Create Key
            </button>
          </div>

          {/* Create Key Modal */}
          {showNewKeyModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Create New API Key</h3>
                <input
                  type="text"
                  placeholder="Key name (e.g., Production, Testing)"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNewKeyModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createNewKey}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Keys List */}
          <div className="divide-y divide-slate-200">
            {keys.filter((k) => !k.revoked_at).length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-600">
                No API keys yet. Create one to get started!
              </div>
            ) : (
              keys
                .filter((k) => !k.revoked_at)
                .map((key) => (
                  <div key={key.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{key.name}</p>
                      <p className="text-sm text-slate-600 font-mono">{key.key_prefix}...</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Created {new Date(key.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {deleteConfirm === key.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => deleteKey(key.id)}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
                          >
                            Confirm Delete
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(key.id)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Revoke key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Revoked Keys */}
          {keys.filter((k) => k.revoked_at).length > 0 && (
            <details className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <summary className="cursor-pointer font-medium text-slate-900">
                Revoked Keys ({keys.filter((k) => k.revoked_at).length})
              </summary>
              <div className="mt-4 space-y-3">
                {keys
                  .filter((k) => k.revoked_at)
                  .map((key) => (
                    <div key={key.id} className="text-sm text-slate-600">
                      <p className="font-medium">{key.name}</p>
                      <p className="text-xs text-slate-500">
                        Revoked {new Date(key.revoked_at!).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
              </div>
            </details>
          )}
        </div>

        {/* Usage Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Usage Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {analytics?.requests_this_month || 0}
              </div>
              <p className="text-slate-600">Requests This Month</p>
              {analytics && (
                <p className="text-sm text-slate-500 mt-2">
                  {analytics.usage_percentage}% of {analytics.plan_limit.toLocaleString()} limit
                </p>
              )}
              {analytics && (
                <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      analytics.usage_percentage > 80
                        ? 'bg-red-600'
                        : analytics.usage_percentage > 50
                          ? 'bg-yellow-600'
                          : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(analytics.usage_percentage, 100)}%` }}
                  ></div>
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {analytics?.active_keys || 0}
              </div>
              <p className="text-slate-600">Active Keys</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {analytics?.plan || 'Free'}
              </div>
              <p className="text-slate-600">Current Plan</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Ready to scale?</h3>
          <p className="text-blue-800 mb-4">Upgrade to Pro for unlimited API calls and priority support.</p>
          <button
            onClick={() => router.push('/pricing')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            View Plans
          </button>
        </div>
      </div>
    </div>
  );
}
