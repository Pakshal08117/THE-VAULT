export type WritingType = 'SHAYARI' | 'POEM' | 'QUOTE' | 'THOUGHT' | 'JOURNAL' | 'NOTE';
export type ShareMode = 'public' | 'passcode' | 'expiring' | 'view_limited';

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  color_hex: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Writing {
  id: string;
  user_id: string;
  title: string;
  content: string;
  content_type: WritingType;
  category_id?: string;
  tag_ids: string[];
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  word_count: number;
}

export interface ShareLink {
  id: string;
  writing_id: string;
  access_token: string;
  share_mode: ShareMode;
  has_passcode: boolean;
  passcode?: string;
  expires_at: string | null;
  view_count: number;
  max_views: number | null;
  views_remaining: number | null;
  last_viewed_at: string | null;
  failed_attempts: number;
  is_locked: boolean;
  lockout_seconds: number;
  is_active: boolean;
  is_expired: boolean;
  is_view_exhausted: boolean;
  created_at: string;
  // Only present in the /shares dashboard list endpoint
  writing_title?: string;
}

export interface VaultSettings {
  defaultContentType: WritingType;
  autoSaveInterval: number;
  enableE2E: boolean;
  theme: 'dark' | 'midnight' | 'classic';
  fontFamily: 'serif' | 'sans';
}
