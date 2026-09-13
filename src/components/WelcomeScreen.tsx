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
  Users,
  ChevronDown,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' }
];

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

  // Language selector state
  const [currentLang, setCurrentLang] = useState('English');
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Entrance animation runs once on initial mount
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

  const handleAppleSignIn = () => {
    setErrorMessage('Apple Sign-In is configured for the Feeder iOS App. For web, please continue with Google or Email.');
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-between bg-[#DDEAE0] dark:bg-slate-950 font-sans select-none transition-colors duration-200 relative min-h-screen">
      
      {/* Centered App Container */}
      <div className="w-full max-w-lg md:max-w-xl mx-auto flex flex-col min-h-screen justify-between relative z-10 shadow-2xl sm:my-2 sm:rounded-[36px] overflow-hidden bg-white dark:bg-slate-900">

        {/* =================================================================== */}
        {/* TOP SCENIC ARTWORK SECTION (1:1 with reference image)                */}
        {/* =================================================================== */}
        <div className={`w-full relative select-none overflow-hidden ${animateEntrance ? 'anim-feeder-hero' : ''}`}>
          <img
            src="/assets/feeder-hero-full.png"
            alt="Feeder - A kinder world for every animal"
            className="w-full h-auto object-cover block select-none pointer-events-none"
          />

          {/* Interactive Language Selector (Positioned right over top-right button) */}
          <div className="absolute top-2.5 right-3.5 sm:top-4 sm:right-5 z-20">
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              id="welcome-lang-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-xs border border-slate-200/90 dark:border-slate-700 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Select Language"
            >
              <span>{currentLang}</span>
              <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform duration-150 ${showLangMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Language Dropdown Menu */}
            {showLangMenu && (
              <div className="absolute top-8 right-0 w-38 bg-white dark:bg-slate-850 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setCurrentLang(lang.label.split(' ')[0]);
                      setShowLangMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-green-50 dark:hover:bg-green-950/40 flex items-center justify-between cursor-pointer"
                  >
                    <span>{lang.label}</span>
                    {currentLang === lang.label.split(' ')[0] && (
                      <Check className="w-3.5 h-3.5 text-[#1E4D2B] dark:text-green-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* BOTTOM AUTHENTICATION PANEL (Clean White Card matching reference)    */}
        {/* =================================================================== */}
        <main className={`w-full bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-t-[40px] shadow-[0_-12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_-12px_40px_rgba(0,0,0,0.4)] -mt-4 sm:-mt-6 relative z-10 px-4 xs:px-5 sm:px-8 pt-3.5 sm:pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex flex-col justify-between flex-1 ${animateEntrance ? 'anim-feeder-panel' : ''}`}>
          
          {/* Feature Icon Row (6 features matching reference in exact order) */}
          <div className="w-full max-w-xl mx-auto mb-2 sm:mb-2.5">
            <div className="grid grid-cols-6 gap-1 sm:gap-2 text-center pb-2 select-none">
              {/* 1. Find Help */}
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="w-8.5 h-8.5 xs:w-9.5 xs:h-9.5 sm:w-10 sm:h-10 rounded-full bg-[#E2EFE7] dark:bg-green-950/60 flex items-center justify-center text-[#1E4D2B] dark:text-green-400 mb-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                  <PawPrint className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[7.5px] xs:text-[8px] sm:text-[9px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">Find Help</span>
              </div>

              {/* 2. Adopt */}
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="w-8.5 h-8.5 xs:w-9.5 xs:h-9.5 sm:w-10 sm:h-10 rounded-full bg-[#E2EFE7] dark:bg-green-950/60 flex items-center justify-center text-[#1E4D2B] dark:text-green-400 mb-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                  <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                </div>
                <span className="text-[7.5px] xs:text-[8px] sm:text-[9px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">Adopt</span>
              </div>

              {/* 3. Support Feeding */}
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="w-8.5 h-8.5 xs:w-9.5 xs:h-9.5 sm:w-10 sm:h-10 rounded-full bg-[#E2EFE7] dark:bg-green-950/60 flex items-center justify-center text-[#1E4D2B] dark:text-green-400 mb-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                  <Soup className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[7.5px] xs:text-[8px] sm:text-[9px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">Support Feeding</span>
              </div>

              {/* 4. Know Your Rights */}
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="w-8.5 h-8.5 xs:w-9.5 xs:h-9.5 sm:w-10 sm:h-10 rounded-full bg-[#E2EFE7] dark:bg-green-950/60 flex items-center justify-center text-[#1E4D2B] dark:text-green-400 mb-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                  <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[7.5px] xs:text-[8px] sm:text-[9px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">Know Your Rights</span>
              </div>

              {/* 5. Learn & Explore */}
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="w-8.5 h-8.5 xs:w-9.5 xs:h-9.5 sm:w-10 sm:h-10 rounded-full bg-[#E2EFE7] dark:bg-green-950/60 flex items-center justify-center text-[#1E4D2B] dark:text-green-400 mb-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                  <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[7.5px] xs:text-[8px] sm:text-[9px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">Learn & Explore</span>
              </div>

              {/* 6. Join a Community */}
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="w-8.5 h-8.5 xs:w-9.5 xs:h-9.5 sm:w-10 sm:h-10 rounded-full bg-[#E2EFE7] dark:bg-green-950/60 flex items-center justify-center text-[#1E4D2B] dark:text-green-400 mb-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[7.5px] xs:text-[8px] sm:text-[9px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">Join a Community</span>
              </div>
            </div>
          </div>

          {/* Auth Controls & Forms Container */}
          <div className="w-full max-w-md mx-auto">
            {/* Error Notice */}
            {errorMessage && (
              <div className="mb-2 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 text-xs text-red-700 dark:text-red-300 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 leading-tight text-[11px]">{errorMessage}</div>
              </div>
            )}

            {!showEmailForm ? (
              <div className="space-y-1.5 sm:space-y-2">
                {/* PRIMARY CTA: Continue with Email (Forest Green Pill matching reference) */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setShowEmailForm(true);
                  }}
                  id="continue-with-email-btn"
                  className="w-full h-10.5 sm:h-11 px-5 rounded-full bg-[#1E4D2B] hover:bg-[#163c22] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-white" />
                  <span>Continue with Email</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white/80 ml-1" />
                </button>

                {/* SECONDARY CTA 1: Continue with Google (White Pill with border matching reference) */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  id="continue-with-google"
                  className="w-full h-10.5 sm:h-11 px-5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
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

                {/* SECONDARY CTA 2: Continue with Apple (Matching Reference Layout) */}
                <button
                  type="button"
                  onClick={handleAppleSignIn}
                  id="continue-with-apple"
                  className="w-full h-10.5 sm:h-11 px-5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 flex-shrink-0 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.64-7.85-11.83-14.42-5.45-8.61-9.76-18.61-12.93-30-3.16-11.39-4.75-22.09-4.75-32.08 0-14.15 3.6-25.75 10.79-34.79 7.19-9.05 16.29-13.67 27.29-13.88 4.79 0 10.01 1.25 15.66 3.76 5.66 2.5 9.47 3.82 11.45 3.96 1.76-.14 5.68-1.52 11.75-4.14 6.07-2.61 11.39-3.8 15.96-3.56 12.08.76 21.72 5.09 28.92 13 4.24 4.67 7.42 10.23 9.53 16.68-10.45 6.31-15.6 15.02-15.45 26.13.15 8.71 3.52 16.05 10.1 22.03 6.58 5.98 14.42 9.47 23.53 10.47-2.07 6.1-4.68 12.51-7.83 19.24zm-29.47-111.4c0 7.07-2.58 13.78-7.75 20.14-6.17 7.51-13.78 11.88-22.84 13.11-.29-1.46-.43-2.92-.43-4.38 0-6.85 2.8-13.56 8.4-20.14 2.8-3.29 6.27-6.03 10.4-8.21 4.14-2.18 8.19-3.41 12.16-3.69.07 1.08.11 2.14.11 3.17z" />
                  </svg>
                  <span>Continue with Apple</span>
                </button>

                {/* OR Divider matching reference */}
                <div className="relative my-1">
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
                  className="w-full h-10.5 sm:h-11 px-5 rounded-full border-1.5 border-[#1E4D2B] dark:border-green-500 text-[#1E4D2B] dark:text-green-400 font-bold text-xs sm:text-sm hover:bg-green-50/60 dark:hover:bg-green-950/30 flex items-center justify-center transition-all active:scale-[0.99] cursor-pointer"
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
                    className="text-xs text-slate-600 dark:text-slate-400 font-medium py-0.5 transition-colors cursor-pointer"
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
                    <Leaf className="w-3 h-3 text-[#1E4D2B] dark:text-green-400 fill-current" />
                    <span>feeder.life</span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-0.5">For animals. For people. For a better tomorrow.</p>
                </div>
              </div>
            ) : (
              /* Email & Password Form (Expanded) */
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 my-auto">
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
                    className="w-full h-10.5 px-5 rounded-full bg-[#1E4D2B] hover:bg-[#163c22] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-all disabled:opacity-50 mt-1 cursor-pointer"
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

        </main>

      </div>

    </div>
  );
};
