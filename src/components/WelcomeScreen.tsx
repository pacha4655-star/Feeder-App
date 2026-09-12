import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  Heart,
  AlertCircle,
  Loader2,
  ArrowLeft,
  PawPrint,
  Scale,
  Soup,
  Leaf,
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
    <div className="w-full max-w-[430px] mx-auto h-[100dvh] sm:h-auto sm:max-h-[96dvh] bg-[#F3F7F4] dark:bg-slate-900 sm:rounded-[36px] shadow-none sm:shadow-2xl sm:border sm:border-slate-200/70 dark:sm:border-slate-800 overflow-hidden flex flex-col justify-between relative font-sans my-auto transition-all duration-200">
      
      {/* ===================================================================== */}
      {/* TOP BRAND & HEADER AREA (Matches Reference Exactly)                   */}
      {/* ===================================================================== */}
      <div className="flex flex-col w-full flex-shrink-0 relative z-0">
        
        {/* Safe-area Header with Official Feeder Brand Centered */}
        <div className={`pt-[max(0.65rem,env(safe-area-inset-top,0px))] px-4 flex flex-col items-center text-center ${animateEntrance ? 'anim-feeder-logo' : ''}`}>
          <FeederLogo size="md" showText={true} textColor="text-[#1E4D2B] dark:text-white" />
        </div>

        {/* Tagline & Supporting Pillars matching reference text */}
        <div className={`text-center px-4 my-1 sm:my-1.5 ${animateEntrance ? 'anim-feeder-tagline' : ''}`}>
          <h1 className="text-sm xs:text-base sm:text-lg font-extrabold text-[#1E4D2B] dark:text-green-300 tracking-tight leading-tight font-['Outfit',sans-serif]">
            A kinder world for every animal.
          </h1>
          <p className="text-[10px] xs:text-[10.5px] font-semibold text-[#1E4D2B]/80 dark:text-green-300/80 tracking-wide mt-0.5">
            Connect • Care • Protect • Empower
          </p>
        </div>

        {/* Hero Animal Image (Full-Width Edge-to-Edge matching reference) */}
        <div className={`w-full aspect-[2.05/1] overflow-hidden relative ${animateEntrance ? 'anim-feeder-hero' : ''}`}>
          <img
            src="/assets/feeder-login-reference.png"
            alt="Feeder Animal Family"
            className="w-full h-full object-cover object-[center_34.5%] select-none pointer-events-none"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BOTTOM AUTHENTICATION PANEL (Rounded white card overlapping rocks)   */}
      {/* ===================================================================== */}
      <div className={`bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-b-[36px] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)] -mt-4 relative z-10 px-4 sm:px-5 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom,0px))] flex flex-col justify-between flex-shrink-0 ${animateEntrance ? 'anim-feeder-panel' : ''}`}>
        
        {/* Feature Icon Row (6 features matching the reference composition) */}
        <div className="grid grid-cols-6 gap-1 text-center pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800 select-none">
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EAF2EC] dark:bg-green-950/60 flex items-center justify-center text-[#1E4D2B] dark:text-green-400 mb-0.5 shadow-2xs">
              <PawPrint className="w-4 h-4" />
            </div>
            <span className="text-[7.5px] sm:text-[8.5px] font-medium text-slate-700 dark:text-slate-300 leading-tight">Find Help</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EAF2EC] dark:bg-green-950/60 flex items-center justify-center text-[#1E4D2B] dark:text-green-400 mb-0.5 shadow-2xs">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <span className="text-[7.5px] sm:text-[8.5px] font-medium text-slate-700 dark:text-slate-300 leading-tight">Adopt</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EAF2EC] dark:bg-green-950/60 flex items-center justify-center text-[#1E4D2B] dark:text-green-400 mb-0.5 shadow-2xs">
              <Soup className="w-4 h-4" />
            </div>
            <span className="text-[7.5px] sm:text-[8.5px] font-medium text-slate-700 dark:text-slate-300 leading-tight">Support Feeding</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EAF2EC] dark:bg-green-950/60 flex items-center justify-center text-[#1E4D2B] dark:text-green-400 mb-0.5 shadow-2xs">
              <Scale className="w-4 h-4" />
            </div>
            <span className="text-[7.5px] sm:text-[8.5px] font-medium text-slate-700 dark:text-slate-300 leading-tight">Know Your Rights</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EAF2EC] dark:bg-green-950/60 flex items-center justify-center text-[#1E4D2B] dark:text-green-400 mb-0.5 shadow-2xs">
              <Leaf className="w-4 h-4" />
            </div>
            <span className="text-[7.5px] sm:text-[8.5px] font-medium text-slate-700 dark:text-slate-300 leading-tight">Learn & Explore</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EAF2EC] dark:bg-green-950/60 flex items-center justify-center text-[#1E4D2B] dark:text-green-400 mb-0.5 shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[7.5px] sm:text-[8.5px] font-medium text-slate-700 dark:text-slate-300 leading-tight">Join a Community</span>
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
            {/* PRIMARY CTA: Continue with Email (Forest Green Pill matching reference) */}
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setShowEmailForm(true);
              }}
              id="continue-with-email-btn"
              className="w-full h-11 sm:h-11.5 px-5 rounded-full bg-[#1E4D2B] hover:bg-[#163c22] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
            >
              <Mail className="w-4 h-4 text-white" />
              <span>Continue with Email</span>
              <ArrowRight className="w-3.5 h-3.5 text-white/80 ml-1" />
            </button>

            {/* SECONDARY CTA: Continue with Google (White Pill with border matching reference) */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              id="continue-with-google"
              className="w-full h-11 sm:h-11.5 px-5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-green-700" />
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

            {/* OR Divider matching reference */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                <span className="bg-white dark:bg-slate-900 px-3">OR</span>
              </div>
            </div>

            {/* CREATE AN ACCOUNT (Outline Pill matching reference) */}
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setAuthMode('register');
                setShowEmailForm(true);
              }}
              id="create-account-button"
              className="w-full h-11 sm:h-11.5 px-5 rounded-full border-1.5 border-[#1E4D2B] dark:border-green-500 text-[#1E4D2B] dark:text-green-400 font-bold text-xs sm:text-sm hover:bg-green-50/60 dark:hover:bg-green-950/30 flex items-center justify-center transition-all active:scale-[0.99] cursor-pointer"
            >
              Create an Account
            </button>

            {/* Already have an account? Log In */}
            <div className="text-center pt-0.5">
              <button
                type="button"
                id="toggle-auth-mode-button"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthMode('login');
                  setShowEmailForm(true);
                }}
                className="text-xs text-slate-600 dark:text-slate-400 font-medium py-1 transition-colors cursor-pointer"
              >
                <span>Already have an account? </span>
                <span className="font-bold text-[#1E4D2B] dark:text-green-400 hover:underline">Log In</span>
              </button>
            </div>

            {/* Pagination Dots matching reference */}
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#1E4D2B] dark:bg-green-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Footer matching reference */}
            <div className="text-center pt-0.5 text-[10px] text-slate-400">
              <div className="flex items-center justify-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                <span>🍃</span>
                <span>feeder.life</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">For animals. For people. For a better tomorrow.</p>
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
                <span>Back to overview</span>
              </button>
              <span className="text-xs font-bold text-[#1E4D2B] dark:text-green-400">
                {authMode === 'register' ? 'Create Verified Account' : 'Sign In'}
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
                        className="w-full h-9 pl-8 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1E4D2B] focus:ring-1 focus:ring-[#1E4D2B]/20"
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
                        className="w-full h-9 pl-7 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1E4D2B] focus:ring-1 focus:ring-[#1E4D2B]/20"
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
                    className="w-full h-9 pl-8 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1E4D2B] focus:ring-1 focus:ring-[#1E4D2B]/20"
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
                    className="w-full h-9 pl-8 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1E4D2B] focus:ring-1 focus:ring-[#1E4D2B]/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                id="login-submit-button"
                className="w-full h-11 px-5 rounded-full bg-[#1E4D2B] hover:bg-[#163c22] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-all disabled:opacity-50 mt-1 cursor-pointer"
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
            <div className="text-center pt-2">
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

            {/* Trust badge */}
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>Protected with Firebase Auth</span>
              <span className="font-semibold text-[#1E4D2B] dark:text-green-400">Feeder 2026</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
