import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  HardDrive,
  User as UserIcon,
  LogOut,
  SlidersHorizontal,
  X,
  FileImage,
  Video,
  Music,
  FileText,
  Code2,
  Archive,
  Layers,
  Sparkles,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDrive } from '../../context/DriveContext';
import { MediaTypeFilter } from '../../types';
import { formatBytes } from '../../utils/formatters';

export const Header: React.FC = () => {
  const { user, logout, demoLogin } = useAuth();
  const {
    searchQuery,
    setSearchQuery,
    mediaTypeFilter,
    setMediaTypeFilter,
    stats,
    setIsStorageModalOpen,
    refresh,
    isLoading,
  } = useDrive();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterOptions: { type: MediaTypeFilter; label: string; icon: any; color: string }[] = [
    { type: 'all', label: 'All Files', icon: Layers, color: 'text-slate-600' },
    { type: 'image', label: 'Photos & Images', icon: FileImage, color: 'text-rose-500' },
    { type: 'video', label: 'Videos & Movies', icon: Video, color: 'text-purple-500' },
    { type: 'audio', label: 'Audio & Music', icon: Music, color: 'text-emerald-500' },
    { type: 'document', label: 'Documents & PDFs', icon: FileText, color: 'text-blue-500' },
    { type: 'code', label: 'Code & Data', icon: Code2, color: 'text-amber-500' },
    { type: 'archive', label: 'Zip Archives', icon: Archive, color: 'text-cyan-500' },
  ];

  return (
    <header className="h-16 bg-white border-b border-[#E5E5DF] px-6 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3.5 min-w-[200px]">
        <div className="w-8 h-8 rounded-lg bg-[#5A5A40] flex items-center justify-center text-white shadow-sm shadow-[#5A5A40]/20">
          <HardDrive className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-semibold tracking-tight text-[#1A1A17]" style={{ fontFamily: 'Georgia, serif' }}>
            Caelum <span className="italic font-normal opacity-70">Drive</span>
          </span>
        </div>
      </div>

      {/* Center: Search & Filter bar */}
      <div className="flex-1 max-w-xl relative px-2 sm:px-6" ref={filterRef}>
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-[#8E8E8A] pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search media, assets, or folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-20 py-2 bg-[#EFEFEA] hover:bg-[#EAEAE4] focus:bg-white text-[#2D2D2A] placeholder-[#8E8E8A] text-sm rounded-full border border-transparent focus:border-[#5A5A40]/40 focus:ring-2 focus:ring-[#5A5A40]/20 transition-all outline-none"
          />

          {/* Quick Clear or Filter button */}
          <div className="absolute right-2 flex items-center gap-1">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 text-[#8E8E8A] hover:text-[#2D2D2A] hover:bg-[#E5E5DF] rounded-full transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-1.5 rounded-full transition-colors flex items-center gap-1 text-xs font-medium ${
                mediaTypeFilter !== 'all'
                  ? 'bg-[#5A5A40]/15 text-[#5A5A40] font-semibold px-2.5'
                  : 'text-[#8E8E8A] hover:text-[#2D2D2A] hover:bg-[#E5E5DF]/70'
              }`}
              title="Filter by file type"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {mediaTypeFilter !== 'all' && (
                <span className="capitalize">{mediaTypeFilter}</span>
              )}
            </button>
          </div>
        </div>

        {/* Filter Popup Menu */}
        {isFilterOpen && (
          <div className="absolute left-2 sm:left-6 right-2 sm:right-6 top-full mt-2 bg-white rounded-2xl shadow-xl border border-[#E5E5DF] p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="text-[10px] font-bold text-[#8E8E8A] px-3 py-1.5 uppercase tracking-wider">
              Filter by media type
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1">
              {filterOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = mediaTypeFilter === opt.type;
                return (
                  <button
                    key={opt.type}
                    onClick={() => {
                      setMediaTypeFilter(opt.type);
                      setIsFilterOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all ${
                      isSelected
                        ? 'bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/30 font-semibold'
                        : 'text-[#71716A] hover:bg-[#F5F5F0] border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#5A5A40]" />
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#5A5A40]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right side: Refresh, Storage Quick Bar & User Profile */}
      <div className="flex items-center gap-3">
        {/* Refresh button */}
        <button
          onClick={() => refresh()}
          disabled={isLoading}
          className="p-2 text-[#8E8E8A] hover:text-[#2D2D2A] hover:bg-[#F5F5F0] rounded-full transition-colors relative"
          title="Refresh Drive"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#5A5A40]' : ''}`} />
        </button>

        {/* User profile & Plan status */}
        <div className="hidden lg:flex items-center gap-3 mr-1">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E8A]">Premium Plan</p>
            <p className="text-xs font-semibold text-[#2D2D2A]">{user?.name || 'User'}</p>
          </div>
        </div>

        {/* User profile dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-10 h-10 rounded-full bg-[#D9D9D2] border-2 border-white overflow-hidden shadow-sm flex items-center justify-center font-bold text-[#5A5A40] hover:ring-2 hover:ring-[#5A5A40]/30 transition-all cursor-pointer"
          >
            {user?.name ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'ET'}
          </button>

          {/* User Menu Dropdown */}
          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#E5E5DF] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-[#E5E5DF]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full bg-[#D9D9D2] flex items-center justify-center text-[#5A5A40] font-bold text-sm shadow-inner"
                  >
                    {user?.name ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'ET'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A17] truncate">{user?.name}</p>
                    <p className="text-xs text-[#8E8E8A] truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Demo Switch User Accounts */}
              <div className="px-3 py-2 border-b border-[#E5E5DF] bg-[#F9F9F7]">
                <p className="text-[10px] font-bold text-[#8E8E8A] uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#5A5A40]" /> Switch Demo Account
                </p>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      demoLogin('alice@example.com');
                      setIsUserMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium text-left transition-colors ${
                      user?.email === 'alice@example.com'
                        ? 'bg-[#5A5A40]/15 text-[#5A5A40] font-semibold'
                        : 'text-[#71716A] hover:bg-white hover:text-[#2D2D2A]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#5A5A40]"></div>
                      <span>Alice Johnson (Owner)</span>
                    </div>
                    {user?.email === 'alice@example.com' && <Check className="w-3.5 h-3.5 text-[#5A5A40]" />}
                  </button>

                  <button
                    onClick={() => {
                      demoLogin('bob@example.com');
                      setIsUserMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium text-left transition-colors ${
                      user?.email === 'bob@example.com'
                        ? 'bg-[#5A5A40]/15 text-[#5A5A40] font-semibold'
                        : 'text-[#71716A] hover:bg-white hover:text-[#2D2D2A]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#71716A]"></div>
                      <span>Bob Smith (Collaborator)</span>
                    </div>
                    {user?.email === 'bob@example.com' && <Check className="w-3.5 h-3.5 text-[#5A5A40]" />}
                  </button>
                </div>
              </div>

              <div className="p-1">
                <button
                  onClick={() => {
                    setIsStorageModalOpen(true);
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#71716A] hover:text-[#2D2D2A] hover:bg-[#F5F5F0] rounded-xl transition-colors"
                >
                  <HardDrive className="w-4 h-4 text-[#8E8E8A]" />
                  <span>Storage & Quota</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
