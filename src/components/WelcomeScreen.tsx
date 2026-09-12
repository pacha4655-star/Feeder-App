import React, { useState, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck, Heart, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FeederLogo } from './FeederLogo';

export const WelcomeScreen: React.FC = () => {
  const { registerWithEmailAccount, loginWithEmailAccount, signInWithGoogleAccount } = useApp();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Run app open animation on initial mount only
  const [animateEntrance, setAnimateEntrance] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setAnimateEntrance(false), 1200);
    return () => clearTimeout(timer);
  }, []);

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
        setErrorMessage(`Domain '${host}' is not authorized in Firebase Authentication. Please add '${host}' to Firebase Console > Authentication > Settings > Authorized domains. You can also sign in with Email & Password.`);
      } else {
        setErrorMessage(err.message || 'Google Sign-In was cancelled or failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] sm:max-w-lg md:max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row font-sans my-auto transition-all duration-200">
      
      {/* ===================================================================== */}
      {/* DESKTOP BRAND BANNER (Left column on md: and above)                   */}
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
            Join a kind community that cares for every paw, wing and soul. Coordinating street animal feedings, veterinary rescues, and ethical pet adoptions worldwide.
          </p>
        </div>

        {/* Hero Animal Visual (Desktop) */}
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
              Kind Network
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
      {/* MOBILE-FIRST AUTHENTICATION CONTAINER (Follows Reference Hierarchy)    */}
      {/* ===================================================================== */}
      <div className="w-full md:w-7/12 p-3.5 xs:p-4 sm:p-6 md:p-8 flex flex-col justify-between bg-white dark:bg-slate-900 max-h-[calc(100dvh-1rem)] md:max-h-none overflow-y-auto">
        <div className="flex flex-col h-full justify-between">
          
          {/* ================================================================= */}
          {/* 1. APP LOGO & WELCOME HEADING                                     */}
          {/* ================================================================= */}
          <div className={`mb-1.5 sm:mb-2.5 ${animateEntrance ? 'anim-feeder-logo' : ''}`}>
            <div className="flex items-center justify-between">
              <FeederLogo size="sm" showText={false} />
              <span className="text-[10px] font-bold text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-950/60 px-2.5 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                Animal Community
              </span>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 2. WELCOME TO FEEDER + SHORT COMMUNITY DESCRIPTION                */}
          {/* ================================================================= */}
          <div className={`mb-2 sm:mb-3 ${animateEntrance ? 'anim-feeder-header' : ''}`}>
            <span className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {authMode === 'register' ? 'Welcome to' : 'Welcome back to'}
            </span>
            <h1 className="text-xl xs:text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight font-['Outfit',sans-serif]">
              Feeder
            </h1>
            <p className="text-[11px] xs:text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-snug mt-1 max-w-sm">
              Join a kind community that cares for every paw, wing and soul.
            </p>
          </div>

          {/* ================================================================= */}
          {/* 3. ANIMAL VISUAL (Controlled Aspect, Responsive Sizing)          */}
          {/* ================================================================= */}
          <div className={`relative rounded-2xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-800 mb-2.5 sm:mb-3.5 h-24 xs:h-32 sm:h-40 md:h-44 w-full flex-shrink-0 ${animateEntrance ? 'anim-feeder-visual' : ''}`}>
            <img
              src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80"
              alt="Caring for animal friends"
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-center justify-between text-white text-[10px] font-semibold">
              <span className="flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2.5 py-0.5 rounded-full">
                <Heart className="w-2.5 h-2.5 text-green-400 fill-green-400 flex-shrink-0" />
                <span>Kind Care Network</span>
              </span>
              <span className="bg-green-700/90 backdrop-blur-xs px-2 py-0.5 rounded-full text-[9px] font-bold">
                100% Real
              </span>
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-2 p-2 sm:p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 text-xs text-red-700 dark:text-red-300 animate-in fade-in duration-150">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed text-[11px]">
                <span className="font-semibold">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 4. AUTHENTICATION ACTIONS (Follows Reference Information Flow)    */}
          {/* ================================================================= */}
          <div className={`space-y-2 sm:space-y-2.5 flex-shrink-0 ${animateEntrance ? 'anim-feeder-actions' : ''}`}>
            
            {/* Quick Action Mode (Reference buttons) */}
            {!showEmailForm ? (
              <>
                {/* 1. Continue with Google */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  id="continue-with-google"
                  className="w-full h-11 xs:h-12 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 border border-slate-300/80 dark:border-slate-700 shadow-2xs active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 flex-shrink-0" viewBox="0 0 24 24">
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
                  <span>Continue with Google</span>
                </button>

                {/* 2. Continue with Email */}
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  id="continue-with-email-btn"
                  className="w-full h-11 xs:h-12 px-4 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm shadow-green-900/15 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span>Continue with Email</span>
                </button>
              </>
            ) : (
              /* Expanded Email & Password Form */
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(false)}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Other options</span>
                  </button>
                  <span className="text-[11px] font-bold text-green-700 dark:text-green-400">
                    {authMode === 'register' ? 'New Account' : 'Sign In'}
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-2">
                  {authMode === 'register' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Name</label>
                        <div className="relative flex items-center">
                          <UserIcon className="w-3 h-3 text-slate-400 absolute left-2.5 pointer-events-none" />
                          <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Priya Sharma"
                            required
                            className="w-full h-8.5 pl-8 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Username</label>
                        <div className="relative flex items-center">
                          <span className="text-slate-400 font-bold absolute left-2.5 text-[10px] pointer-events-none">@</span>
                          <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            placeholder="priya_feeder"
                            className="w-full h-8.5 pl-6.5 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600/20"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Email</label>
                    <div className="relative flex items-center">
                      <Mail className="w-3 h-3 text-slate-400 absolute left-2.5 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        required
                        id="login-email-input"
                        className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Password</label>
                    <div className="relative flex items-center">
                      <Lock className="w-3 h-3 text-slate-400 absolute left-2.5 pointer-events-none" />
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        id="login-password-input"
                        className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    id="login-submit-button"
                    className="w-full h-10 px-4 rounded-xl bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm shadow-green-700/20 active:scale-[0.99] transition-all disabled:opacity-50 mt-1 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
              </div>
            )}

            {/* =============================================================== */}
            {/* 5. EXISTING ACCOUNT ACTION (Follows Reference Image Prompt)       */}
            {/* =============================================================== */}
            <div className="text-center pt-1.5 sm:pt-2">
              <button
                type="button"
                id="toggle-auth-mode-button"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                }}
                className="text-xs text-slate-600 dark:text-slate-400 font-medium py-1 transition-colors cursor-pointer"
              >
                {authMode === 'register' ? (
                  <>
                    <span>Already have an account? </span>
                    <span className="font-bold text-green-700 dark:text-green-400 hover:underline">Log in</span>
                  </>
                ) : (
                  <>
                    <span>New to Feeder? </span>
                    <span className="font-bold text-green-700 dark:text-green-400 hover:underline">Create an account</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Compact Trust Footer */}
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-medium flex-shrink-0">
            <span>Protected with Firebase Auth</span>
            <span className="font-semibold text-green-700 dark:text-green-400">Feeder 2026</span>
          </div>

        </div>
      </div>
    </div>
  );
};
