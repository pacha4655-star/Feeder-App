import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Heart, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FeederLogo } from './FeederLogo';

export const WelcomeScreen: React.FC = () => {
  const { registerWithEmailAccount, loginWithEmailAccount, signInWithGoogleAccount } = useApp();
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
    <div className="w-full max-w-[420px] sm:max-w-lg md:max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row min-h-0 md:min-h-[560px] lg:min-h-[580px] font-sans my-auto transition-all duration-200">
      
      {/* ===================================================================== */}
      {/* DESKTOP-ONLY BANNER (Left column on md: and above)                    */}
      {/* ===================================================================== */}
      <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-[#192A1D] via-[#214328] to-[#2E7D32] p-6 lg:p-8 flex-col justify-between relative text-white select-none">
        <div>
          <div className="flex items-center justify-between mb-4">
            <FeederLogo size="md" showText={true} textColor="text-white" />
          </div>

          <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight mt-4 font-['Outfit',sans-serif]">
            Where animal people <span className="text-green-400">connect</span> & care.
          </h2>
          <p className="text-xs lg:text-sm text-green-100/90 mt-2.5 leading-relaxed">
            Coordinating street animal feedings, urgent veterinary rescues, community foster networks, and ethical pet adoptions worldwide.
          </p>
        </div>

        {/* Hero Animal Image (Desktop) */}
        <div className="relative my-4 rounded-2xl overflow-hidden shadow-lg bg-white/10 border border-white/20 md:flex-1 min-h-[160px] max-h-56">
          <img
            src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80"
            alt="Animal friends"
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white font-medium">
            <span className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-medium">
              <Heart className="w-3 h-3 text-green-400 fill-green-400 flex-shrink-0" />
              <span>Community Care</span>
            </span>
            <span className="bg-green-600 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-xs">
              Real Network
            </span>
          </div>
        </div>

        {/* Value Prop Badges (Desktop) */}
        <div className="flex items-center gap-2 text-xs text-green-100/90 pt-3 border-t border-white/15">
          <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span>Real Verified Feeders • Cloud Synchronized</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* AUTHENTICATION COLUMN (Fluid on Mobile, Right Column on Desktop)      */}
      {/* ===================================================================== */}
      <div className="w-full md:w-7/12 p-3 xs:p-4 sm:p-6 md:p-8 flex flex-col justify-between bg-white dark:bg-slate-900 overflow-y-auto max-h-[calc(100dvh-1rem)] md:max-h-none">
        <div>
          {/* Mobile-Only Compact Header & Responsive Hero Image */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-1">
              <FeederLogo size="sm" showText={true} textColor="text-[#192A1D] dark:text-white" />
              <span className="text-[10px] font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/60 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                Animal Care Platform
              </span>
            </div>

            <p className="text-[11px] text-[#4B6354] dark:text-slate-400 font-medium leading-tight mb-1.5">
              Where animal people <span className="text-green-700 dark:text-green-400 font-bold">connect</span> & care worldwide.
            </p>

            {/* Scaled Hero Image for mobile (auto-scales, no scroll needed) */}
            <div className="relative rounded-xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800 h-12 xs:h-16 sm:h-20 w-full mb-2">
              <img
                src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&auto=format&fit=crop&q=80"
                alt="Animal friends"
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-white text-[10px] font-semibold">
                <span className="flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full">
                  <Heart className="w-2.5 h-2.5 text-green-400 fill-green-400" />
                  <span>Community Network</span>
                </span>
                <span className="bg-green-700 px-2 py-0.5 rounded-full text-[9px] font-bold">
                  Verified Feeders
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Title & Subtext */}
          <div className="hidden md:block">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#192A1D] dark:text-white tracking-tight leading-tight font-['Outfit',sans-serif]">
              {authMode === 'register' ? 'Join Feeder Community' : 'Welcome back'}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#4B6354] dark:text-slate-400 mt-1">
              {authMode === 'register'
                ? 'Create a verified account to coordinate animal feeding & rescue.'
                : 'Sign in to access your community feed and urgent alerts.'}
            </p>
          </div>

          {/* Mobile Auth Mode Heading */}
          <div className="md:hidden flex items-center justify-between mb-1.5">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white font-['Outfit',sans-serif]">
              {authMode === 'register' ? 'Create Account' : 'Sign In'}
            </h2>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {authMode === 'register' ? 'Join local caregivers' : 'Enter your credentials'}
            </span>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-2 p-2 sm:p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 text-xs text-red-700 dark:text-red-300 animate-in fade-in duration-150">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed text-[11px] sm:text-xs">
                <span className="font-semibold">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Google Sign-In Button */}
          <div className="space-y-2 sm:space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              id="continue-with-google"
              className="w-full h-10 sm:h-11 px-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
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
              <span className="truncate">Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-2.5 my-1 sm:my-2">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Or email</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-2.5">
              {authMode === 'register' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Full Name</label>
                    <div className="relative flex items-center">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Priya Sharma"
                        required
                        className="w-full h-9 sm:h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/15 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Username</label>
                    <div className="relative flex items-center">
                      <span className="text-slate-400 font-bold absolute left-3 text-[11px] pointer-events-none">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="priya_feeder"
                        className="w-full h-9 sm:h-10 pl-7 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/15 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    required
                    id="login-email-input"
                    className="w-full h-9 sm:h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/15 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    id="login-password-input"
                    className="w-full h-9 sm:h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/15 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                id="login-submit-button"
                className="w-full h-10 sm:h-11 px-4 rounded-xl bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-green-700/20 active:scale-[0.99] transition-all disabled:opacity-50 mt-1 sm:mt-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'register' ? 'Create Verified Account' : 'Sign In'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Login / Register */}
            <div className="text-center pt-1">
              <button
                type="button"
                id="toggle-auth-mode-button"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                }}
                className="text-xs text-green-700 dark:text-green-400 hover:text-green-800 font-bold hover:underline py-0.5 transition-colors cursor-pointer"
              >
                {authMode === 'login'
                  ? "Don't have an account? Create one"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>

        {/* Compact Footer info */}
        <div className="pt-2 sm:pt-3 mt-2 sm:mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>Protected with Firebase Auth</span>
          <span className="font-semibold text-green-700 dark:text-green-400">Feeder 2026</span>
        </div>
      </div>
    </div>
  );
};
