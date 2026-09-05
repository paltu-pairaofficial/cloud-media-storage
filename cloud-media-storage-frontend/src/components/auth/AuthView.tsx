import React, { useState } from 'react';
import { Cloud, Lock, Mail, User as UserIcon, ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthView: React.FC = () => {
  const { login, register, switchDemoUser } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemoClick = async (email: string) => {
    setIsLoading(true);
    setError('');
    try {
      await switchDemoUser(email);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (isRegisterMode && !name) {
      setError('Please provide your name');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      if (isRegisterMode) {
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
                <span>15 GB free storage tier with category breakdowns</span>
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

          {/* Quick Demo Switcher */}
          <div className="mt-8 pt-6 border-t border-[#E5E5DF]">
            <p className="text-[11px] font-bold text-[#8E8E8A] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>Instant 1-Click Demo Profiles</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoClick('alice@example.com')}
                className="p-2.5 rounded-[14px] bg-white hover:bg-[#F5F5F0] border border-[#E5E5DF] hover:border-[#5A5A40] text-left transition-all group disabled:opacity-50 cursor-pointer"
              >
                <p className="text-xs font-bold text-[#2D2D2A] group-hover:text-[#5A5A40]">Alice (Owner)</p>
                <p className="text-[10px] text-[#8E8E8A] truncate">alice@example.com</p>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoClick('bob@example.com')}
                className="p-2.5 rounded-[14px] bg-white hover:bg-[#F5F5F0] border border-[#E5E5DF] hover:border-[#5A5A40] text-left transition-all group disabled:opacity-50 cursor-pointer"
              >
                <p className="text-xs font-bold text-[#2D2D2A] group-hover:text-[#5A5A40]">Bob (Editor)</p>
                <p className="text-[10px] text-[#8E8E8A] truncate">bob@example.com</p>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="p-8 md:p-10 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-[#2D2D2A] font-['Georgia',serif]">
              {isRegisterMode ? 'Create your account' : 'Welcome back'}
            </h3>
            <p className="text-xs text-[#8E8E8A] mt-1">
              {isRegisterMode
                ? 'Sign up to start organizing and storing files'
                : 'Sign in to access your cloud files and folders'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
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
              <label className="block text-xs font-bold text-[#2D2D2A] mb-1.5">
                Password
              </label>
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
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-[14px]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#4A4A33] disabled:opacity-50 text-white text-xs font-bold rounded-[14px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>{isLoading ? 'Processing...' : isRegisterMode ? 'Create Account' : 'Sign In'}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError('');
              }}
              className="text-xs text-[#71716A] hover:text-[#5A5A40] font-medium transition-colors"
            >
              {isRegisterMode ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
