import { create } from 'zustand';

export type Mood = 'hype' | 'curious' | 'funny' | 'sincere' | 'controversial' | 'rage_bait';
export type AppStatus = 'idle' | 'fetching_captions' | 'generating' | 'sending' | 'done' | 'error';

export interface Comment {
  id: string;
  text: string;
}

export interface SecureSettings {
  groqApiKey: string;
  groqModel: string;
  telegramBotToken: string;
  telegramChannelId: string;
}

interface AppState {
  settings: SecureSettings;
  settingsLoaded: boolean;
  reelUrl: string;
  mood: Mood;
  commentCount: number;
  targetLanguage: string;
  feedback: string;
  captions: string;
  captionsSource: string;
  comments: Comment[];
  status: AppStatus;
  errorMessage: string;
  settingsOpen: boolean;

  setSettings: (settings: SecureSettings) => void;
  setSettingsLoaded: (loaded: boolean) => void;
  setReelUrl: (url: string) => void;
  setMood: (mood: Mood) => void;
  setCommentCount: (count: number) => void;
  setTargetLanguage: (lang: string) => void;
  setFeedback: (feedback: string) => void;
  setCaptions: (captions: string) => void;
  setCaptionsSource: (source: string) => void;
  setComments: (comments: Comment[]) => void;
  setStatus: (status: AppStatus) => void;
  setErrorMessage: (msg: string) => void;
  setSettingsOpen: (open: boolean) => void;
  
  isSettingsComplete: () => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: {
    groqApiKey: '',
    groqModel: 'llama-3.3-70b-versatile',
    telegramBotToken: '',
    telegramChannelId: '',
  },
  settingsLoaded: false,
  reelUrl: '',
  mood: 'hype',
  commentCount: 5,
  targetLanguage: 'English',
  feedback: '',
  captions: '',
  captionsSource: '',
  comments: [],
  status: 'idle',
  errorMessage: '',
  settingsOpen: false,

  setSettings: (settings) => set({ settings }),
  setSettingsLoaded: (settingsLoaded) => set({ settingsLoaded }),
  setReelUrl: (reelUrl) => set({ reelUrl }),
  setMood: (mood) => set({ mood }),
  setCommentCount: (commentCount) => set({ commentCount }),
  setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
  setFeedback: (feedback) => set({ feedback }),
  setCaptions: (captions) => set({ captions }),
  setCaptionsSource: (captionsSource) => set({ captionsSource }),
  setComments: (comments) => set({ comments }),
  setStatus: (status) => set({ status, errorMessage: status === 'error' ? get().errorMessage : '' }),
  setErrorMessage: (errorMessage) => set({ errorMessage, status: 'error' }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  isSettingsComplete: () => {
    const { settings } = get();
    return !!(settings.groqApiKey && settings.telegramBotToken && settings.telegramChannelId);
  },
}));
