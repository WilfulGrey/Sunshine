export interface VisibilityState {
  isVisible: boolean;
  lastVisibilityChange: Date;
  hiddenTime: number;
}

export interface VisibilityRefreshOptions {
  minInterval?: number; // milliseconds
  threshold?: number; // minimum hidden time before refresh
}

export const getVisibilityAPI = () => {
  // Check for Page Visibility API support
  if (typeof document === 'undefined') return null;

  const hiddenProperty = (() => {
    if ('hidden' in document && document.hidden !== undefined) return 'hidden';
    if ('webkitHidden' in document && (document as any).webkitHidden !== undefined) return 'webkitHidden';
    if ('mozHidden' in document && (document as any).mozHidden !== undefined) return 'mozHidden';
    if ('msHidden' in document && (document as any).msHidden !== undefined) return 'msHidden';
    return null;
  })();

  const visibilityChangeEvent = (() => {
    if ('hidden' in document && document.hidden !== undefined) return 'visibilitychange';
    if ('webkitHidden' in document && (document as any).webkitHidden !== undefined) return 'webkitvisibilitychange';
    if ('mozHidden' in document && (document as any).mozHidden !== undefined) return 'mozvisibilitychange';
    if ('msHidden' in document && (document as any).msHidden !== undefined) return 'msvisibilitychange';
    return null;
  })();

  if (!hiddenProperty || !visibilityChangeEvent) return null;

  return {
    hiddenProperty,
    visibilityChangeEvent,
    isHidden: () => Boolean((document as any)[hiddenProperty])
  };
};

export const isVisibilityAPISupported = (): boolean => {
  return getVisibilityAPI() !== null;
};