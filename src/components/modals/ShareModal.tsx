import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  UserPlus,
  Link2,
  Copy,
  Check,
  Globe,
  Trash2,
  Loader2,
  Shield,
} from 'lucide-react';
import { useDrive } from '../../context/DriveContext';
import { Share, LinkShare } from '../../types';
import { api } from '../../services/api';

export const ShareModal: React.FC = () => {
  const { shareModalTarget, setShareModalTarget } = useDrive();

  const [emailInput, setEmailInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'editor'>('viewer');
  const [sharesList, setSharesList] = useState<Share[]>([]);
  const [ownerInfo, setOwnerInfo] = useState<{ id: string; name: string; email: string; avatarColor: string } | null>(null);
  const [linkShare, setLinkShare] = useState<LinkShare | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (shareModalTarget) {
      if (shareModalTarget.type === 'multiple') {
        setSharesList([]);
        setOwnerInfo(null);
        setLinkShare(null);
        setStatusMessage(null);
        setIsLoading(false);
      } else {
        loadShareData();
      }
    }
  }, [shareModalTarget]);

  const loadShareData = async () => {
    if (!shareModalTarget || shareModalTarget.type === 'multiple') return;
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const [sharesRes, linkRes] = await Promise.all([
        api.getResourceShares(shareModalTarget.type, shareModalTarget.id),
        api.getLinkShare(shareModalTarget.type, shareModalTarget.id),
      ]);
      setSharesList(sharesRes.shares);
      setOwnerInfo(sharesRes.owner);
      setLinkShare(linkRes.linkShare);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to load share settings' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!shareModalTarget) return null;

  const isMultiple = shareModalTarget.type === 'multiple';

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setIsAdding(true);
    setStatusMessage(null);
    try {
      if (shareModalTarget.type === 'multiple') {
        const res = await api.shareMultipleResources({
          fileIds: shareModalTarget.fileIds || [],
          folderIds: shareModalTarget.folderIds || [],
          email: emailInput.trim(),
          role: selectedRole,
        });
        setEmailInput('');
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        const res = await api.shareResource({
          resourceType: shareModalTarget.type,
          resourceId: shareModalTarget.id,
          email: emailInput.trim(),
          role: selectedRole,
        });
        setEmailInput('');
        setStatusMessage({ type: 'success', text: res.message });
        loadShareData();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to share resource' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateRole = async (shareId: string, role: 'viewer' | 'editor') => {
    try {
      await api.updateShareRole(shareId, role);
      loadShareData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update role' });
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      await api.removeShare(shareId);
      loadShareData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to remove collaborator' });
    }
  };

  const handleCreatePublicLink = async () => {
    try {
      const res = await api.createOrUpdateLinkShare({
        resourceType: shareModalTarget.type,
        resourceId: shareModalTarget.id,
        role: 'viewer',
        allowDownload: true,
      });
      setLinkShare(res.linkShare);
      setStatusMessage({ type: 'success', text: 'Public link generated!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create link' });
    }
  };

  const handleRemovePublicLink = async () => {
    try {
      await api.removeLinkShare(shareModalTarget.type, shareModalTarget.id);
      setLinkShare(null);
      setStatusMessage({ type: 'success', text: 'Public link disabled' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to remove link' });
    }
  };

  const handleCopyLink = () => {
    if (!linkShare) return;
    const url = `${window.location.origin}?shareToken=${linkShare.token}`;
    navigator.clipboard.writeText(url);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2D2D2A]/40 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-100">
      <div className="bg-white rounded-[28px] p-6 max-w-lg w-full shadow-2xl border border-[#E5E5DF] animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-[14px] bg-[#F5F5F0] text-[#5A5A40] border border-[#E5E5DF] flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#2D2D2A] font-['Georgia',serif] truncate">
                Share "{shareModalTarget.name}"
              </h3>
              <p className="text-xs text-[#8E8E8A] capitalize">Manage access and collaboration</p>
            </div>
          </div>

          <button
            onClick={() => setShareModalTarget(null)}
            className="p-1.5 text-[#8E8E8A] hover:text-[#2D2D2A] hover:bg-[#F5F5F0] rounded-full transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Status message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-[14px] text-xs font-semibold flex items-center justify-between ${
                statusMessage.type === 'success'
                  ? 'bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/30'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <span>{statusMessage.text}</span>
              <button onClick={() => setStatusMessage(null)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Add People Input Form */}
          <div>
            <label className="block text-xs font-bold text-[#2D2D2A] mb-1.5">
              Add people by email
            </label>
            <form onSubmit={handleAddCollaborator} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  placeholder="e.g. colleague@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full pl-3.5 pr-24 py-2.5 bg-[#F5F5F0] border border-[#E5E5DF] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 rounded-[14px] text-xs font-medium text-[#2D2D2A] outline-none transition-all placeholder:text-[#8E8E8A]"
                />

                {/* Role select inside input */}
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'viewer' | 'editor')}
                  className="absolute right-1 top-1 bottom-1 bg-transparent text-xs font-semibold text-[#71716A] px-2 rounded-lg border-l border-[#E5E5DF] outline-none cursor-pointer"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isAdding || !emailInput.trim()}
                className="px-4 py-2.5 bg-[#5A5A40] hover:bg-[#4A4A33] disabled:opacity-50 text-white text-xs font-bold rounded-[14px] shadow-sm flex items-center gap-1.5 transition-all"
              >
                {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span>Add</span>
              </button>
            </form>
          </div>

          {isMultiple ? (
            <div className="p-3.5 rounded-[18px] border border-[#E5E5DF] bg-[#F5F5F0]/60 text-xs text-[#71716A] flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#5A5A40] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#2D2D2A]">Bulk Sharing</p>
                <p className="text-[11px] text-[#8E8E8A] mt-0.5">
                  Permissions will be granted to all selected items at once. To generate public links or inspect individual permissions, open Share on a single item.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* People with Access List */}
              <div>
                <h4 className="text-xs font-bold text-[#2D2D2A] mb-2">People with access</h4>
                <div className="divide-y divide-[#E5E5DF]/70 border border-[#E5E5DF] rounded-[18px] p-1 bg-[#F5F5F0]/60">
                  {/* Owner */}
                  {ownerInfo && (
                    <div className="p-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ backgroundColor: ownerInfo.avatarColor || '#5A5A40' }}
                        >
                          {ownerInfo.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#2D2D2A] truncate">{ownerInfo.name}</p>
                          <p className="text-[11px] text-[#8E8E8A] truncate">{ownerInfo.email}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#71716A] px-2 py-1 bg-white rounded-lg border border-[#E5E5DF]">
                        Owner
                      </span>
                    </div>
                  )}

                  {/* Collaborators */}
                  {sharesList.map((share) => (
                    <div key={share.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ backgroundColor: share.userAvatarColor || '#736B5E' }}
                        >
                          {(share.userName || share.sharedWithEmail).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#2D2D2A] truncate">{share.userName || share.sharedWithEmail}</p>
                          <p className="text-[11px] text-[#8E8E8A] truncate">{share.sharedWithEmail}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          value={share.role}
                          onChange={(e) => handleUpdateRole(share.id, e.target.value as 'viewer' | 'editor')}
                          className="bg-white border border-[#E5E5DF] text-xs font-semibold text-[#2D2D2A] py-1 px-2 rounded-lg outline-none cursor-pointer hover:border-[#5A5A40]"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>

                        <button
                          onClick={() => handleRemoveShare(share.id)}
                          className="p-1 text-[#8E8E8A] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove access"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {sharesList.length === 0 && !isLoading && (
                    <p className="text-xs text-[#8E8E8A] text-center py-2">
                      No other people have been granted direct access yet.
                    </p>
                  )}
                </div>
              </div>

              {/* General Access / Public Link Section */}
              <div className="pt-2 border-t border-[#E5E5DF]">
                <h4 className="text-xs font-bold text-[#2D2D2A] mb-2">General access</h4>

                <div className="p-3.5 rounded-[18px] border border-[#E5E5DF] bg-[#F5F5F0]/60 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 ${
                          linkShare ? 'bg-[#5A5A40]/15 text-[#5A5A40]' : 'bg-[#E5E5DF] text-[#8E8E8A]'
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#2D2D2A]">
                          {linkShare ? 'Anyone with the link' : 'Restricted link'}
                        </p>
                        <p className="text-[11px] text-[#8E8E8A]">
                          {linkShare
                            ? 'Anyone on the internet with this link can view & download'
                            : 'Only people with direct access can open'}
                        </p>
                      </div>
                    </div>

                    {linkShare ? (
                      <button
                        onClick={handleRemovePublicLink}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        onClick={handleCreatePublicLink}
                        className="text-xs font-semibold text-[#5A5A40] hover:text-[#4A4A33] px-3 py-1.5 rounded-[12px] bg-[#5A5A40]/10 hover:bg-[#5A5A40]/20 transition-colors"
                      >
                        Create Link
                      </button>
                    )}
                  </div>

                  {linkShare && (
                    <div className="flex items-center gap-2 pt-2 border-t border-[#E5E5DF]">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}?shareToken=${linkShare.token}`}
                        className="flex-1 px-3 py-2 bg-white border border-[#E5E5DF] rounded-[12px] text-xs text-[#2D2D2A] truncate font-mono select-all"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-3.5 py-2 bg-[#5A5A40] hover:bg-[#4A4A33] text-white text-xs font-bold rounded-[12px] flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
                      >
                        {isCopying ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopying ? 'Copied!' : 'Copy link'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-[#E5E5DF] mt-4 shrink-0">
          <button
            onClick={() => setShareModalTarget(null)}
            className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4A4A33] text-white text-xs font-bold rounded-[14px] shadow-sm transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
