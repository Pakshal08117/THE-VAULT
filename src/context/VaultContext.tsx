import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Writing, Category, Tag, ShareLink, VaultSettings, WritingType, ShareMode } from '../types';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

interface VaultContextType {
  writings: Writing[];
  categories: Category[];
  tags: Tag[];
  shareLinks: ShareLink[];
  settings: VaultSettings;
  loading: boolean;
  createWriting: (writing: Omit<Writing, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Writing>;
  updateWriting: (id: string, updates: Partial<Writing>) => Promise<Writing>;
  deleteWriting: (id: string) => Promise<void>;
  createCategory: (name: string, colorHex: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  createTag: (name: string) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  generateShareLink: (writingId: string, passcode?: string, expiresHours?: number, shareMode?: ShareMode, maxViews?: number) => Promise<ShareLink>;
  deleteShareLink: (writingId: string) => Promise<void>;
  fetchAllShareLinks: () => Promise<ShareLink[]>;
  updateSettings: (newSettings: Partial<VaultSettings>) => void;
  getWritingShareLink: (writingId: string) => ShareLink | undefined;
}

const defaultSettings: VaultSettings = {
  defaultContentType: 'NOTE',
  autoSaveInterval: 5,
  enableE2E: false,
  theme: 'dark',
  fontFamily: 'serif',
};

const defaultCategories = [
  { name: 'Shayaris', color_hex: '#10b981' },
  { name: 'Poems', color_hex: '#d4af37' },
  { name: 'Quotes', color_hex: '#f43f5e' },
  { name: 'Thoughts', color_hex: '#06b6d4' },
  { name: 'Journals', color_hex: '#a855f7' },
  { name: 'Notes', color_hex: '#64748b' },
];

const defaultTags = [
  { name: 'Solitude' },
  { name: 'Melancholy' },
  { name: 'Love' },
  { name: 'Philosophy' },
  { name: 'Inspiration' },
];

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [writings, setWritings] = useState<Writing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [settings, setSettings] = useState<VaultSettings>(defaultSettings);
  const [loading, setLoading] = useState<boolean>(true);

  // Load data when user changes
  useEffect(() => {
    if (!user) {
      setWritings([]);
      setCategories([]);
      setTags([]);
      setShareLinks([]);
      setLoading(false);
      return;
    }

    const loadVaultData = async () => {
      setLoading(true);
      try {
        const userId = user.id;

        // 1. Load settings (stored locally as it is a UI preference)
        const userSettingsKey = `vault_settings_${userId}`;
        const storedSettings = localStorage.getItem(userSettingsKey);
        if (storedSettings) {
          setSettings(JSON.parse(storedSettings));
        } else {
          setSettings(defaultSettings);
        }

        // 2. Load categories from API
        let loadedCats: Category[] = await api.get('/api/v1/categories');
        if (loadedCats.length === 0) {
          // Auto-seed default categories for fresh experience
          const promises = defaultCategories.map(c => 
            api.post('/api/v1/categories', { name: c.name, color_hex: c.color_hex })
          );
          loadedCats = await Promise.all(promises);
        }
        setCategories(loadedCats);

        // 3. Load tags from API
        let loadedTags: Tag[] = await api.get('/api/v1/tags');
        if (loadedTags.length === 0) {
          // Auto-seed default tags
          const promises = defaultTags.map(t => 
            api.post('/api/v1/tags', { name: t.name })
          );
          loadedTags = await Promise.all(promises);
        }
        setTags(loadedTags);

        // 4. Load writings from API
        const writingsResponse = await api.get('/api/v1/writings?per_page=1000');
        const loadedWritings: Writing[] = writingsResponse.items.map((w: any) => ({
          id: w.id,
          user_id: w.user_id,
          title: w.title,
          content: w.content,
          content_type: w.content_type,
          category_id: w.category_id || undefined,
          tag_ids: w.tags.map((t: any) => t.id),
          is_favorite: w.is_favorite,
          is_archived: w.is_archived,
          created_at: w.created_at,
          updated_at: w.updated_at,
          word_count: w.word_count,
        }));
        setWritings(loadedWritings);

        // 5. Extract share links from writings response
        const activeShareLinks: ShareLink[] = [];
        writingsResponse.items.forEach((w: any) => {
          if (w.share_links && w.share_links.length > 0) {
            activeShareLinks.push(...w.share_links);
          }
        });
        setShareLinks(activeShareLinks);
      } catch (err) {
        console.error('Failed to load Vault data from server:', err);
      } finally {
        setLoading(false);
      }
    };

    loadVaultData();
  }, [user]);

  const createWriting = async (writingData: Omit<Writing, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Writing> => {
    if (!user) throw new Error('Authentication required');

    // Resolve tag_ids to string names for the backend API
    const tagNames = (writingData.tag_ids || [])
      .map(id => tags.find(t => t.id === id)?.name)
      .filter(Boolean) as string[];

    const response = await api.post('/api/v1/writings', {
      title: writingData.title,
      content: writingData.content,
      content_type: writingData.content_type,
      category_id: writingData.category_id || null,
      is_favorite: writingData.is_favorite,
      is_archived: writingData.is_archived,
      tags: tagNames,
    });

    const newWriting: Writing = {
      ...response,
      tag_ids: response.tags.map((t: any) => t.id),
    };

    setWritings(prev => [newWriting, ...prev]);
    return newWriting;
  };

  const updateWriting = async (id: string, updates: Partial<Writing>): Promise<Writing> => {
    if (!user) throw new Error('Authentication required');

    // If we're only toggling favorite or archived, utilize clean server-side patches
    const keys = Object.keys(updates);
    if (keys.length === 1 && keys[0] === 'is_favorite') {
      const response = await api.patch(`/api/v1/writings/${id}/favorite`);
      const updated = writings.map(w => w.id === id ? { ...w, is_favorite: response.is_favorite } : w);
      setWritings(updated);
      return updated.find(w => w.id === id)!;
    }
    if (keys.length === 1 && keys[0] === 'is_archived') {
      const response = await api.patch(`/api/v1/writings/${id}/archive`);
      const updated = writings.map(w => w.id === id ? { ...w, is_archived: response.is_archived } : w);
      setWritings(updated);
      return updated.find(w => w.id === id)!;
    }

    // Otherwise, perform a full PUT update
    const current = writings.find(w => w.id === id);
    if (!current) throw new Error('Writing not found');

    const merged = { ...current, ...updates };
    const tagNames = merged.tag_ids
      .map(tId => tags.find(t => t.id === tId)?.name)
      .filter(Boolean) as string[];

    const response = await api.put(`/api/v1/writings/${id}`, {
      title: merged.title,
      content: merged.content,
      content_type: merged.content_type,
      category_id: merged.category_id || null,
      is_favorite: merged.is_favorite,
      is_archived: merged.is_archived,
      tags: tagNames,
    });

    const updatedWriting: Writing = {
      ...response,
      tag_ids: response.tags.map((t: any) => t.id),
    };

    setWritings(writings.map(w => w.id === id ? updatedWriting : w));
    return updatedWriting;
  };

  const deleteWriting = async (id: string): Promise<void> => {
    if (!user) throw new Error('Authentication required');
    await api.delete(`/api/v1/writings/${id}`);
    setWritings(prev => prev.filter(w => w.id !== id));
    setShareLinks(prev => prev.filter(l => l.writing_id !== id));
  };

  const createCategory = async (name: string, colorHex: string): Promise<Category> => {
    if (!user) throw new Error('Authentication required');
    const response = await api.post('/api/v1/categories', {
      name,
      color_hex: colorHex,
    });
    setCategories(prev => [...prev, response]);
    return response;
  };

  const deleteCategory = async (id: string): Promise<void> => {
    if (!user) throw new Error('Authentication required');
    await api.delete(`/api/v1/categories/${id}`);
    setCategories(prev => prev.filter(c => c.id !== id));
    
    // Cascade category removal locally
    setWritings(prev => prev.map(w => w.category_id === id ? { ...w, category_id: undefined } : w));
  };

  const createTag = async (name: string): Promise<Tag> => {
    if (!user) throw new Error('Authentication required');
    const response = await api.post('/api/v1/tags', { name });
    setTags(prev => {
      if (prev.some(t => t.id === response.id)) return prev;
      return [...prev, response];
    });
    return response;
  };

  const deleteTag = async (id: string): Promise<void> => {
    if (!user) throw new Error('Authentication required');
    await api.delete(`/api/v1/tags/${id}`);
    setTags(prev => prev.filter(t => t.id !== id));
    
    // Cascade tag removal locally
    setWritings(prev => prev.map(w => {
      if (w.tag_ids.includes(id)) {
        return { ...w, tag_ids: w.tag_ids.filter(tId => tId !== id) };
      }
      return w;
    }));
  };

  const generateShareLink = async (writingId: string, passcode?: string, expiresHours = 24, shareMode: ShareMode = 'public', maxViews?: number): Promise<ShareLink> => {
    if (!user) throw new Error('Authentication required');

    const response = await api.post(`/api/v1/writings/${writingId}/share`, {
      passcode: passcode || null,
      expires_in_hours: expiresHours,
      share_mode: shareMode,
      max_views: maxViews || null,
    });

    const newLink: ShareLink = {
      id: response.id,
      writing_id: response.writing_id,
      access_token: response.access_token,
      share_mode: response.share_mode || 'public',
      expires_at: response.expires_at,
      has_passcode: response.has_passcode,
      view_count: response.view_count,
      max_views: response.max_views ?? null,
      views_remaining: response.views_remaining ?? null,
      last_viewed_at: response.last_viewed_at ?? null,
      failed_attempts: response.failed_attempts ?? 0,
      is_locked: response.is_locked ?? false,
      lockout_seconds: response.lockout_seconds ?? 0,
      is_active: response.is_active,
      is_expired: response.is_expired ?? false,
      is_view_exhausted: response.is_view_exhausted ?? false,
      created_at: response.created_at,
    };

    setShareLinks(prev => {
      const filtered = prev.filter(l => l.writing_id !== writingId);
      return [...filtered, newLink];
    });

    return newLink;
  };

  const deleteShareLink = async (writingId: string): Promise<void> => {
    if (!user) throw new Error('Authentication required');
    await api.delete(`/api/v1/writings/${writingId}/share`);
    setShareLinks(prev => prev.filter(l => l.writing_id !== writingId));
  };

  const fetchAllShareLinks = useCallback(async (): Promise<ShareLink[]> => {
    if (!user) return [];
    const response: ShareLink[] = await api.get('/api/v1/writings/shares');
    return response;
  }, [user]);

  const updateSettings = (newSettings: Partial<VaultSettings>) => {
    if (!user) return;
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(`vault_settings_${user.id}`, JSON.stringify(updated));
  };

  const getWritingShareLink = (writingId: string) => {
    return shareLinks.find(l => l.writing_id === writingId && l.is_active && (!l.expires_at || new Date(l.expires_at) > new Date()));
  };

  return (
    <VaultContext.Provider
      value={{
        writings,
        categories,
        tags,
        shareLinks,
        settings,
        loading,
        createWriting,
        updateWriting,
        deleteWriting,
        createCategory,
        deleteCategory,
        createTag,
        deleteTag,
        generateShareLink,
        deleteShareLink,
        fetchAllShareLinks,
        updateSettings,
        getWritingShareLink,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
