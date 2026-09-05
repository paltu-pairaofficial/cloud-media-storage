import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

interface AuthViewProps {
  initialResetToken?: string | null;
}

export const AuthView: React.FC<AuthViewProps> = ({ initialResetToken }) => {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<AuthMode>(() => (initialResetToken ? 'reset' : 'login'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState<string>(initialResetToken || '');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Reset password flow verification state
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [resetUserEmail, setResetUserEmail] = useState('');
  const [resetComplete, setResetComplete] = useState(false);

  // When initialResetToken changes or on mount
  useEffect(() => {
    if (initialResetToken) {
      setResetToken(initialResetToken);
      setMode('reset');
      verifyToken(initialResetToken);
    }
  }, [initialResetToken]);

  const verifyToken = async (tok: string) => {
    setIsVerifyingToken(true);
    setError('');
    try {
      const res = await api.verifyResetToken(tok);
      if (res.valid) {
        setTokenVerified(true);
        setResetUserEmail(res.email);
        setEmail(res.email);
      }
    } catch (err: any) {
      setTokenVerified(false);
      setError(err.message || 'Invalid or expired password reset link');
    } finally {
      setIsVerifyingToken(false);
    }
  };

  const handleLoginOrRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (mode === 'register' && !name) {
      setError('Please provide your full name');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      if (mode === 'register') {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await api.forgotPassword(email.trim());
      setSuccessMessage(res.message || 'If an account exists for this email, a password reset link has been sent.');
    } catch (err: any) {
      setError(err.message || 'Failed to process password reset request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await api.resetPassword(resetToken, password);
      setSuccessMessage(res.message || 'Password has been reset successfully');
      setResetComplete(true);
      // Clean up URL param if present
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const openResetModeWithToken = (tok: string) => {
    setResetToken(tok);
    setMode('reset');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMessage('');
    setResetComplete(false);
    verifyToken(tok);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#2D2D2A] flex items-center justify-center p-4 selection:bg-[#5A5A40] selection:text-white">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-[32px] border border-[#E5E5DF] shadow-2xl overflow-hidden">
        {/* Left Side: Brand Highlights */}
        <div className="p-8 md:p-10 bg-[#EFEFEA] border-b md:border-b-0 md:border-r border-[#E5E5DF] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-[16px] bg-[#5A5A40] flex items-center justify-center text-white shadow-md">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#2D2D2A] font-['Georgia',serif] tracking-tight">Cloud Media Storage</h1>
                <p className="text-xs text-[#5A5A40] font-medium">Enterprise Cloud Drive</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-[#2D2D2A] font-['Georgia',serif] leading-snug mb-4">
              Fast, secure & collaborative cloud storage.
            </h2>
            <p className="text-xs text-[#71716A] leading-relaxed mb-6">
              Organize folders, preview multimedia assets, share links with granular permissions, and collaborate seamlessly in real time.
            </p>

            <div className="space-y-3 text-xs text-[#4A4A45]">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#5A5A40] shrink-0" />
                <span>1 GB storage with visual category breakdown</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#5A5A40] shrink-0" />
                <span>Live media previews for images, video, audio & code</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#5A5A40] shrink-0" />
                <span>Granular sharing with Viewer/Editor role control</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#E5E5DF]">
            <p className="text-[11px] text-[#71716A] leading-relaxed">
              Protected with secure token authentication, encrypted password hashing, and encrypted media storage.
            </p>
          </div>
        </div>

        {/* Right Side: Auth Form Container */}
        <div className="p-8 md:p-10 flex flex-col justify-center bg-white">
      
          {/* MODE: FORGOT PASSWORD */}
         
          {mode === 'forgot' && (
            <div>
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[#71716A] hover:text-[#2D2D2A] font-medium mb-3 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
                <h3 className="text-xl font-bold text-[#2D2D2A] font-['Georgia',serif]">
                  Reset your password
                </h3>
                <p className="text-xs text-[#8E8E8A] mt-1">
                  Enter your registered email address and we will send you a secure password reset link.
                </p>
              </div>

              {successMessage ? (
                /* Success Card with Email Sent Confirmation */
                <div className="space-y-4">
                  <div className="p-5 rounded-[18px] bg-[#5A5A40]/10 border border-[#5A5A40]/25 text-left">
                    <div className="flex items-center gap-2 text-[#5A5A40] font-bold text-xs mb-2">
                      <CheckCircle2 className="w-4 h-4 text-[#5A5A40] shrink-0" />
                      <span>Check your email</span>
                    </div>
                    <p className="text-xs text-[#2D2D2A] leading-relaxed mb-3">
                      {successMessage}
                    </p>
                    <p className="text-[11px] text-[#71716A] leading-relaxed">
                      Please check your inbox (and spam folder) for instructions to reset your password. The link is valid for 1 hour.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setSuccessMessage('');
                    }}
                    className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#4A4A33] text-white text-xs font-bold rounded-[14px] shadow-sm transition-colors cursor-pointer"
                  >
                    Return to Sign In
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setSuccessMessage('');
                    }}
                    className="w-full py-2 bg-transparent hover:bg-[#F5F5F0] text-xs font-medium text-[#71716A] hover:text-[#2D2D2A] rounded-[14px] transition-colors cursor-pointer"
                  >
                    Try a different email address
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2D2D2A] mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#8E8E8A] absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        disabled={isLoading}
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F0] border border-[#E5E5DF] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 rounded-[14px] text-xs font-medium text-[#2D2D2A] placeholder:text-[#8E8E8A] outline-none transition-all disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-[14px] text-xs font-semibold text-rose-700">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#4A4A33] disabled:opacity-50 text-white text-xs font-bold rounded-[14px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                    <span>{isLoading ? 'Sending email...' : 'Send Reset Link'}</span>
                    {!isLoading && <ArrowRight className="w-4 h-4" />}
                  </button>

                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError('');
                      }}
                      className="text-xs text-[#71716A] hover:text-[#5A5A40] font-medium transition-colors cursor-pointer"
                    >
                      Remember your password? Sign in
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
 
          {/* MODE: RESET PASSWORD */}
  
          {mode === 'reset' && (
            <div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[#2D2D2A] font-['Georgia',serif]">
                  {resetComplete ? 'Password Updated' : 'Set New Password'}
                </h3>
                <p className="text-xs text-[#8E8E8A] mt-1">
                  {resetComplete
                    ? 'Your password has been changed successfully.'
                    : resetUserEmail
                    ? `Resetting password for ${resetUserEmail}`
                    : 'Enter your new password below.'}
                </p>
              </div>

              {isVerifyingToken ? (
                <div className="py-8 flex flex-col items-center justify-center gap-3 text-[#71716A]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#5A5A40]" />
                  <p className="text-xs font-medium">Verifying reset link...</p>
                </div>
              ) : resetComplete ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-[18px] bg-emerald-50 border border-emerald-200 text-left">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Password Reset Completed</span>
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      You can now sign in to your Cloud Drive using your new password.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setPassword('');
                      setConfirmPassword('');
                      setError('');
                      setSuccessMessage('');
                      setResetComplete(false);
                    }}
                    className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#4A4A33] text-white text-xs font-bold rounded-[14px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Sign In with New Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : !tokenVerified ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-[18px] bg-rose-50 border border-rose-200 text-left">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs mb-1">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Invalid or Expired Link</span>
                    </div>
                    <p className="text-xs text-rose-700 leading-relaxed">
                      {error || 'This password reset link is invalid or has expired. Please request a new one.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                    }}
                    className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#4A4A33] text-white text-xs font-bold rounded-[14px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Request New Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2D2D2A] mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#8E8E8A] absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        disabled={isLoading}
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F0] border border-[#E5E5DF] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 rounded-[14px] text-xs font-medium text-[#2D2D2A] placeholder:text-[#8E8E8A] outline-none transition-all disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2D2D2A] mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#8E8E8A] absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        disabled={isLoading}
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F0] border border-[#E5E5DF] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 rounded-[14px] text-xs font-medium text-[#2D2D2A] placeholder:text-[#8E8E8A] outline-none transition-all disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-[14px] text-xs font-semibold text-rose-700">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#4A4A33] disabled:opacity-50 text-white text-xs font-bold rounded-[14px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                    <span>{isLoading ? 'Updating password...' : 'Save New Password'}</span>
                    {!isLoading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              )}

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-[#71716A] hover:text-[#5A5A40] font-medium transition-colors cursor-pointer"
                >
                  Cancel and return to sign in
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* MODE: LOGIN OR REGISTER */}
          {/* ==================================================== */}
          {(mode === 'login' || mode === 'register') && (
            <div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[#2D2D2A] font-['Georgia',serif]">
                  {mode === 'register' ? 'Create your account' : 'Welcome back'}
                </h3>
                <p className="text-xs text-[#8E8E8A] mt-1">
                  {mode === 'register'
                    ? 'Sign up to start organizing and storing files'
                    : 'Sign in to access your cloud files and folders'}
                </p>
              </div>

              <form onSubmit={handleLoginOrRegister} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-[#2D2D2A] mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#8E8E8A] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        disabled={isLoading}
                        placeholder="e.g. Sarah Connor"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F0] border border-[#E5E5DF] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 rounded-[14px] text-xs font-medium text-[#2D2D2A] placeholder:text-[#8E8E8A] outline-none transition-all disabled:opacity-60"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#2D2D2A] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8E8E8A] absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      disabled={isLoading}
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F0] border border-[#E5E5DF] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 rounded-[14px] text-xs font-medium text-[#2D2D2A] placeholder:text-[#8E8E8A] outline-none transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#2D2D2A]">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setError('');
                          setSuccessMessage('');
                        }}
                        className="text-[11px] font-semibold text-[#5A5A40] hover:text-[#4A4A33] hover:underline transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8E8E8A] absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      disabled={isLoading}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F0] border border-[#E5E5DF] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 rounded-[14px] text-xs font-medium text-[#2D2D2A] placeholder:text-[#8E8E8A] outline-none transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-[14px] text-xs font-semibold text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#4A4A33] disabled:opacity-50 text-white text-xs font-bold rounded-[14px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>{isLoading ? 'Processing...' : mode === 'register' ? 'Create Account' : 'Sign In'}</span>
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setError('');
                  }}
                  className="text-xs text-[#71716A] hover:text-[#5A5A40] font-medium transition-colors cursor-pointer"
                >
                  {mode === 'register' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
