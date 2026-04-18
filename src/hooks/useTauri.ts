import { invoke } from '@tauri-apps/api/tauri';
import { SecureSettings } from '../store/useAppStore';

export interface CaptionsResult {
  captions: string;
  title: string;
  source: string;
}

export interface CommentsResult {
  comments: string[];
}

export interface TelegramResult {
  sent: number;
}

export const useTauri = () => {
  const loadSettings = async (): Promise<SecureSettings> => {
    const raw: any = await invoke('load_settings');
    return {
      groqApiKey: raw.groq_api_key,
      groqModel: raw.groq_model,
      telegramBotToken: raw.telegram_bot_token,
      telegramChannelId: raw.telegram_channel_id,
      };

  };

  const saveSettings = async (settings: SecureSettings): Promise<void> => {
    await invoke('save_settings', {
      settings: {
        groq_api_key: settings.groqApiKey,
        groq_model: settings.groqModel,
        telegram_bot_token: settings.telegramBotToken,
        telegram_channel_id: settings.telegramChannelId,
      },
    });
  };

  const fetchCaptions = async (url: string, groqApiKey: string): Promise<CaptionsResult> => {
    return await invoke('fetch_captions', { url, groqApiKey });
  };

  const generateComments = async (
    captions: string,
    mood: string,
    count: number,
    language: string,
    feedback: string,
    groqApiKey: string,
    model: string
  ): Promise<CommentsResult> => {
    return await invoke('generate_comments', {
      captions,
      mood,
      count,
      language,
      feedback,
      groqApiKey: groqApiKey,
      model,
    });

  };

  const sendToTelegram = async (
    comments: string[],
    botToken: string,
    channelId: string
  ): Promise<TelegramResult> => {
    return await invoke('send_to_telegram', {
      comments,
      botToken,
      channelId,
    });
  };

  return {
    loadSettings,
    saveSettings,
    fetchCaptions,
    generateComments,
    sendToTelegram,
  };
};
