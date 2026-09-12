import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  Heart,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  Home,
  Users
} from 'lucide-react';
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

  // App open entrance animation runs once on initial mount only
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
    <div className="w-full max-w-[440px] sm:max-w-lg md:max-w-4xl mx-auto h-[100dvh] sm:h-auto sm:max-h-[96dvh] md:max-h-none bg-white dark:bg-slate-900 rounded-none sm:rounded-3xl shadow-none sm:shadow-2xl border-0 sm:border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row font-sans my-auto transition-all duration-200">
      
      {/* ===================================================================== */}
      {/* DESKTOP HERO BANNER (Left column on md: and above)                   */}
      {/* ===================================================================== */}
      <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-[#192A1D] via-[#214328] to-[#2E7D32] p-6 lg:p-8 flex-col justify-between relative text-white select-none">
        <div>
          <div className="flex items-center justify-between mb-4">
            <FeederLogo size="md" showText={true} textColor="text-white" />
          </div>

          <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight mt-4 font-['Outfit',sans-serif]">
            A kinder world for <span className="text-green-400">every animal.</span>
          </h2>
          <p className="text-xs lg:text-sm text-green-100/90 mt-2.5 leading-relaxed">
            Join a compassionate community dedicated to coordinating street animal feedings, veterinary emergency rescues, and ethical pet adoptions worldwide.
          </p>
        </div>

        {/* Hero Animal Visual (Desktop) */}
        <div className="relative my-4 rounded-2xl overflow-hidden shadow-lg bg-white/10 border border-white/20 md:flex-1 min-h-[160px] max-h-56">
          <img
            src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80"
            alt="Feeder Animal Friends"
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white font-medium">
            <span className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-medium">
              <Heart className="w-3 h-3 text-green-400 fill-green-400 flex-shrink-0" />
              <span>Kind Care Network</span>
            </span>
            <span className="bg-green-600 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-xs">
              100% Real Care
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
      {/* MOBILE-FIRST APP LOGIN CONTAINER (Follows Reference Hierarchy)        */}
      {/* ===================================================================== */}
      <div className="w-full md:w-7/12 flex flex-col justify-between bg-white dark:bg-slate-900 overflow-y-auto h-full max-h-[100dvh] sm:max-h-none">
        
        {/* TOP + HERO SECTION */}
        <div className="p-3.5 xs:p-4 sm:p-6 flex flex-col">
          {/* Status-bar-safe Header with Official Feeder Logo */}
          <div className={`pt-[max(0.25rem,env(safe-area-inset-top,0px))] flex items-center justify-between mb-1 sm:mb-2 ${animateEntrance ? 'anim-feeder-logo' : ''}`}>
            <FeederLogo size="sm" showText={true} />
            <span className="text-[10px] font-bold text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-950/60 px-2.5 py-0.5 rounded-full border border-green-200 dark:border-green-800">
              Community
            </span>
          </div>

          {/* Tagline & Short Intro */}
          <div className={`my-1 sm:my-2 ${animateEntrance ? 'anim-feeder-tagline' : ''}`}>
            <h1 className="text-lg xs:text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight font-['Outfit',sans-serif]">
              A kinder world for every animal.
            </h1>
            <p className="text-[11px] xs:text-xs text-slate-600 dark:text-slate-300 font-medium leading-snug mt-0.5">
              Connecting compassionate caregivers, street animal feeders, and emergency rescues.
            </p>
          </div>

          {/* Hero Animal Image (Controlled Aspect Ratio, Responsive Sizing) */}
          <div className={`relative rounded-2xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-800 my-1 sm:my-2 h-28 xs:h-32 sm:h-36 md:h-44 w-full flex-shrink-0 ${animateEntrance ? 'anim-feeder-hero' : ''}`}>
            <img
              src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80"
              alt="Caring for animal friends"
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-center justify-between text-white text-[10px] font-semibold">
              <span className="flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full">
                <Heart className="w-2.5 h-2.5 text-green-400 fill-green-400 flex-shrink-0" />
                <span>Kind Care Network</span>
              </span>
              <span className="bg-green-700/90 backdrop-blur-xs px-2 py-0.5 rounded-full text-[9px] font-bold">
                100% Real
              </span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* BOTTOM AUTHENTICATION PANEL (Rounded light panel matching reference)*/}
        {/* =================================================================== */}
        <div className={`bg-slate-50/90 dark:bg-slate-850/90 rounded-t-3xl sm:rounded-none border-t border-slate-200/80 dark:border-slate-800 p-3.5 xs:p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))] flex flex-col justify-between flex-shrink-0 ${animateEntrance ? 'anim-feeder-panel' : ''}`}>
          
          {/* Feature Icon Row (Real Feeder Capabilities) */}
          <div className="grid grid-cols-4 gap-1.5 pb-2.5 mb-2 border-b border-slate-200/60 dark:border-slate-700/60 text-center">
            <div className="flex flex-col items-center justify-center p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-2xs">
              <span className="text-xs sm:text-sm">🐾</span>
              <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">Feed</span>
            </div>
            <div className="flex flex-col items-center justify-center p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-2xs">
              <span className="text-xs sm:text-sm">🚨</span>
              <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">Rescue</span>
            </div>
            <div className="flex flex-col items-center justify-center p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-2xs">
              <span className="text-xs sm:text-sm">🏡</span>
              <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">Adopt</span>
            </div>
            <div className="flex flex-col items-center justify-center p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-2xs">
              <span className="text-xs sm:text-sm">🤝</span>
              <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">Connect</span>
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-2 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 text-xs text-red-700 dark:text-red-300 animate-in fade-in duration-150">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-tight text-[11px]">{errorMessage}</div>
            </div>
          )}

          {/* Main Authentication Controls */}
          {!showEmailForm ? (
            <div className="space-y-2">
              {/* PRIMARY: Continue with Email */}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setShowEmailForm(true);
                }}
                id="continue-with-email-btn"
                className="w-full h-11 sm:h-12 px-4 rounded-xl bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-md shadow-green-700/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span>Continue with Email</span>
                </div>
                <ArrowRight className="w-4 h-4 text-white/90" />
              </button>

              {/* SECONDARY: Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                id="continue-with-google"
                className="w-full h-10.5 sm:h-11 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                    <span>Connecting Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Existing Account / Create Account Toggle */}
              <div className="text-center pt-1.5">
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
                      <span className="font-bold text-green-700 dark:text-green-400 hover:underline">Log In</span>
                    </>
                  ) : (
                    <>
                      <span>New to Feeder? </span>
                      <span className="font-bold text-green-700 dark:text-green-400 hover:underline">Create an Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Email & Password Form (Expanded) */
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors py-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>All options</span>
                </button>
                <span className="text-xs font-bold text-green-700 dark:text-green-400">
                  {authMode === 'register' ? 'Create Account' : 'Sign In'}
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
                          placeholder="Priya S."
                          required
                          className="w-full h-8.5 pl-8 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Username</label>
                      <div className="relative flex items-center">
                        <span className="text-slate-400 text-xs absolute left-2.5 pointer-events-none">@</span>
                        <input
                          type="text"
                          value={username}
                          onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="priya"
                          className="w-full h-8.5 pl-7 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600/20"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Email Address</label>
                  <div className="relative flex items-center">
                    <Mail className="w-3 h-3 text-slate-400 absolute left-2.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="caregiver@domain.com"
                      required
                      id="login-email-input"
                      className="w-full h-8.5 pl-8 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600/20"
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
                      className="w-full h-8.5 pl-8 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600/20"
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

              {/* Mode toggle */}
              <div className="text-center pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                  }}
                  className="text-xs text-slate-600 dark:text-slate-400 font-medium hover:underline cursor-pointer"
                >
                  {authMode === 'register'
                    ? 'Already have an account? Log In'
                    : 'New to Feeder? Create an Account'}
                </button>
              </div>
            </div>
          )}

          {/* Compact Trust Footer */}
          <div className="pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 font-medium flex-shrink-0">
            <span>Protected with Firebase Auth</span>
            <span className="font-semibold text-green-700 dark:text-green-400">Feeder 2026</span>
          </div>

        </div>
      </div>
    </div>
  );
};
