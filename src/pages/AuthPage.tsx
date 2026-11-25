import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { SUPPORTED_LANGUAGES } from '../lib/constants';
import { CivicLensLogo } from '../components/layout/Logo';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { setSession, locations } = useApp();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [homeLocationSlug, setHomeLocationSlug] = useState('bengaluru');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showReset, setShowReset] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const res = await api.register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          homeLocationSlug,
          preferredLanguage,
        });
        setSession(res.token, res.user);
      } else {
        const res = await api.login({ email: email.trim(), password });
        setSession(res.token, res.user);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetMessage(null);
    try {
      const res = await api.requestPasswordReset(email.trim());
      setResetMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process reset request');
    }
  };

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-[#20364A] bg-[#102338] p-7 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <CivicLensLogo className="h-7 w-7" />
          <span className="font-display text-lg font-bold text-[#F4F8FC]">CivicLens</span>
        </div>

        <h1 className="mt-5 font-display text-2xl font-bold text-[#F4F8FC]">
          {showReset ? 'Reset Password' : mode === 'login' ? 'Sign In to CivicLens' : 'Create Citizen Account'}
        </h1>
        <p className="mt-1 text-xs text-[#9AABBB]">
          {showReset
            ? 'Enter your account email to request password recovery.'
            : mode === 'login'
              ? 'Access your civic reports, followed localities, and CivicLens AI history.'
              : 'Public browsing is open to everyone. Create an account to submit reports and join community discussions.'}
        </p>

        {showReset ? (
          <form onSubmit={handlePasswordReset} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs text-[#9AABBB] mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3.5 py-2.5 text-sm text-[#F4F8FC]"
              />
            </div>
            {resetMessage && <p className="text-xs text-[#48E6B0]">{resetMessage}</p>}
            {error && <p className="text-xs text-[#FB7185]">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-[#19C98A] py-2.5 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0]"
            >
              Send Reset Instructions
            </button>
            <button
              type="button"
              onClick={() => setShowReset(false)}
              className="w-full text-center text-xs text-[#9AABBB] hover:text-[#F4F8FC]"
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-name" className="block text-xs text-[#9AABBB] mb-1">
                  Full Name *
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  minLength={2}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Ananya Rao"
                  className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3.5 py-2.5 text-sm text-[#F4F8FC]"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs text-[#9AABBB] mb-1">
                Email Address *
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="citizen@example.in"
                className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3.5 py-2.5 text-sm text-[#F4F8FC]"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs text-[#9AABBB] mb-1">
                Password * {mode === 'signup' && '(minimum 8 characters)'}
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={mode === 'signup' ? 8 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3.5 py-2.5 text-sm text-[#F4F8FC]"
              />
            </div>

            {mode === 'signup' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-[#9AABBB] mb-1">Home Locality (Optional)</label>
                  <select
                    value={homeLocationSlug}
                    onChange={(e) => setHomeLocationSlug(e.target.value)}
                    className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                  >
                    {locations.map((l) => (
                      <option key={l.id} value={l.slug}>
                        {l.name}, {l.state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#9AABBB] mb-1">Preferred Language</label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name} ({l.native})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-[#FB7185]">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#19C98A] py-2.5 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0] disabled:opacity-50"
            >
              {submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <div className="flex items-center justify-between pt-2 text-xs text-[#9AABBB]">
              {mode === 'login' ? (
                <>
                  <button type="button" onClick={() => setShowReset(true)} className="hover:text-[#F4F8FC]">
                    Forgot password?
                  </button>
                  <Link to="/signup" className="text-[#19C98A] hover:underline">
                    Create an account
                  </Link>
                </>
              ) : (
                <Link to="/login" className="text-[#19C98A] hover:underline">
                  Already have an account? Sign In
                </Link>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
