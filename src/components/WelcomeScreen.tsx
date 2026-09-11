import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Heart, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FeederLogo } from './FeederLogo';

export const WelcomeScreen: React.FC = () => {
  const { registerWithEmailAccount, loginWithEmailAccount, signInWithGoogleAccount, showToast } = useApp();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'register') {
        await registerWithEmailAccount(email.trim(), password, {
          name: name.trim() || undefined,
          username: username.trim() || undefined
        });
      } else {
        await loginWithEmailAccount(email.trim(), password);
      }
    } catch (err: any) {
      let msg = err.message || 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please sign in instead.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogleAccount();
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('authorized') || err.message?.includes('unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        setErrorMessage(`Domain '${host}' is not authorized in Firebase Authentication. Please add '${host}' to Firebase Console > Authentication > Settings > Authorized domains. You can also sign in with Email & Password below.`);
      } else {
        setErrorMessage(err.message || 'Google Sign-In was cancelled or failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-0 md:min-h-[580px] font-sans my-auto">
      {/* Left Column (Hero Art & Badges) */}
      <div className="w-full md:w-5/12 bg-gradient-to-br from-[#192A1D] via-[#214328] to-[#2E7D32] p-3 xs:p-4 sm:p-6 md:p-8 flex flex-col justify-between relative text-white">
        <div>
          <div className="flex items-center justify-between mb-1 sm:mb-4">
            <FeederLogo size="md" showText={true} textColor="text-white" />
          </div>

          <h2 className="text-base xs:text-lg sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug sm:leading-tight mt-1 sm:mt-5">
            Where animal people <span className="text-green-400">connect</span> & care.
          </h2>
          <p className="text-[11px] xs:text-xs sm:text-sm text-green-100/90 mt-1 sm:mt-3 leading-relaxed hidden xs:block">
            Coordinating street animal feedings, urgent veterinary rescues, community foster networks, and ethical pet adoptions worldwide.
          </p>
        </div>

        {/* Hero Animal Image */}
        <div className="relative my-1.5 sm:my-4 md:my-5 rounded-xl sm:rounded-2xl overflow-hidden shadow-md sm:shadow-lg bg-white/10 border border-white/20 aspect-[21/9] xs:aspect-[16/9] sm:aspect-[4/3] max-h-24 xs:max-h-32 sm:max-h-52 md:max-h-none">
          <img
            src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80"
            alt="Animal friends"
            className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-1.5 xs:bottom-2 left-2 right-2 flex items-center justify-between text-white font-medium gap-1">
            <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[11px] truncate">
              <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-400 fill-green-400 flex-shrink-0" />
              <span>Community Care</span>
            </span>
            <span className="bg-green-600 backdrop-blur-md px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold truncate">
              Real Network
            </span>
          </div>
        </div>

        {/* Value Prop Badges */}
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] xs:text-[11px] sm:text-xs text-green-100/90 pt-1 sm:pt-2 border-t border-white/10 flex-wrap">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" /> Real Verified Feeders
          </span>
          <span>•</span>
          <span>Cloud Synchronized</span>
        </div>
      </div>

      {/* Right Column: Authentication Form */}
      <div className="w-full md:w-7/12 p-3 xs:p-4 sm:p-6 md:p-8 flex flex-col justify-between bg-white">
        <div>
          <div>
            <h1 className="text-base xs:text-lg sm:text-2xl lg:text-3xl font-extrabold text-[#192A1D] tracking-tight leading-tight">
              {authMode === 'register' ? 'Join Feeder Community' : 'Welcome back'}
            </h1>
            <p className="text-[11px] xs:text-xs sm:text-sm font-medium text-[#4B6354] mt-0.5 sm:mt-1">
              {authMode === 'register'
                ? 'Create a verified account to coordinate animal feeding & rescue.'
                : 'Sign in to access your local community feed and alerts.'}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-2.5 sm:mt-4 p-2 sm:p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Social Google Sign-In */}
          <div className="mt-2.5 sm:mt-5 space-y-2 sm:space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              id="continue-with-google"
              className="w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 sm:gap-3 border border-slate-300 shadow-2xs active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span className="truncate">Continue with Google Account</span>
            </button>

            <div className="flex items-center gap-3 my-1.5 sm:my-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">Or email</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2 sm:top-2.5" />
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Priya Sharma"
                        required
                        className="w-full pl-9 sm:pl-10 pr-3.5 py-1.5 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">Username</label>
                    <div className="relative">
                      <span className="text-slate-400 font-bold absolute left-3 top-1.5 sm:top-2 text-xs">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="priya_feeder"
                        className="w-full pl-7 sm:pl-8 pr-3.5 py-1.5 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2 sm:top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    required
                    className="w-full pl-9 sm:pl-10 pr-3.5 py-1.5 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2 sm:top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-9 sm:pl-10 pr-3.5 py-1.5 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-green-700/20 active:scale-[0.98] transition-all disabled:opacity-50 mt-1 sm:mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'register' ? 'Create Verified Account' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Login / Register */}
            <div className="text-center pt-1 sm:pt-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                }}
                className="text-xs text-green-700 hover:text-green-800 font-bold hover:underline"
              >
                {authMode === 'login'
                  ? "Don't have an account? Create one"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 sm:pt-4 mt-2 sm:mt-4 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
          <span>Protected with Firebase Authentication</span>
          <span className="font-semibold text-green-700">Feeder 2026</span>
        </div>
      </div>
    </div>
  );
};

