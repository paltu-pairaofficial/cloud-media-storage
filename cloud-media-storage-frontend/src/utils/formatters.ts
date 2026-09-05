export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today, ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday, ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getFileCategory(mimeType: string, name: string): 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'code' | 'archive' | 'other' {
  const m = mimeType.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (m.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) {
    return 'image';
  }
  if (m.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) {
    return 'video';
  }
  if (m.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) {
    return 'audio';
  }
  if (m === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (
    m.includes('document') ||
    m.includes('text') ||
    m.includes('msword') ||
    m.includes('presentation') ||
    m.includes('sheet') ||
    ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'rtf', 'csv'].includes(ext)
  ) {
    return 'document';
  }
  if (
    m.includes('json') ||
    m.includes('javascript') ||
    m.includes('typescript') ||
    m.includes('html') ||
    ['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'sh', 'sql', 'yaml', 'yml'].includes(ext)
  ) {
    return 'code';
  }
  if (
    m.includes('zip') ||
    m.includes('tar') ||
    m.includes('rar') ||
    m.includes('7z') ||
    ['zip', 'tar', 'gz', 'rar', '7z', 'bz2'].includes(ext)
  ) {
    return 'archive';
  }
  return 'other';
}
