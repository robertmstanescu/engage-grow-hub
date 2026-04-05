export interface LivePreviewCmsPage {
  rows: any[];
  meta_title?: string;
  meta_description?: string;
  status?: string;
}

export interface LivePreviewBlogPost {
  key?: string;
  slug: string;
  title: string;
  published_at: string | null;
  content: string;
  category: string;
  cover_image: string | null;
  author_name: string | null;
  author_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  tags: string[] | null;
}

export interface LivePreviewState {
  sections: Record<string, any>;
  cmsPages: Record<string, LivePreviewCmsPage>;
  blogPosts: Record<string, LivePreviewBlogPost>;
}

const STORAGE_KEY = "lovable-live-preview-state";
const EVENT_NAME = "lovable-live-preview-updated";

const EMPTY_STATE: LivePreviewState = {
  sections: {},
  cmsPages: {},
  blogPosts: {},
};

const normalizeState = (value: any): LivePreviewState => ({
  sections: value?.sections || {},
  cmsPages: value?.cmsPages || {},
  blogPosts: value?.blogPosts || {},
});

export const readLivePreviewState = (): LivePreviewState => {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
};

export const writeLivePreviewState = (state: LivePreviewState): LivePreviewState => {
  if (typeof window === "undefined") return state;
  const normalized = normalizeState(state);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }));
  return normalized;
};

export const patchLivePreviewState = (patch: Partial<LivePreviewState>): LivePreviewState => {
  const current = readLivePreviewState();
  return writeLivePreviewState({
    sections: { ...current.sections, ...(patch.sections || {}) },
    cmsPages: { ...current.cmsPages, ...(patch.cmsPages || {}) },
    blogPosts: { ...current.blogPosts, ...(patch.blogPosts || {}) },
  });
};

export const subscribeLivePreview = (callback: (state: LivePreviewState) => void) => {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback(readLivePreviewState());
  };

  const handleCustomEvent = (event: Event) => {
    callback(normalizeState((event as CustomEvent<LivePreviewState>).detail));
  };

  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.data?.type !== "CMS_LIVE_PREVIEW_UPDATE") return;
    callback(normalizeState(event.data.state));
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(EVENT_NAME, handleCustomEvent as EventListener);
  window.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(EVENT_NAME, handleCustomEvent as EventListener);
    window.removeEventListener("message", handleMessage);
  };
};

export const pushLivePreviewToWindow = (targetWindow: Window | null | undefined, state: LivePreviewState) => {
  if (!targetWindow || typeof window === "undefined") return;
  targetWindow.postMessage({ type: "CMS_LIVE_PREVIEW_UPDATE", state }, window.location.origin);
};