import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useTauri } from '../hooks/useTauri';
import { X, Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';
import './SettingsModal.css';

export const SettingsModal: React.FC = () => {
  const { settings, setSettings, setSettingsOpen } = useAppStore();
  const { saveSettings } = useTauri();
  
  const [localSettings, setLocalSettings] = useState(settings);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showTeleToken, setShowTeleToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!localSettings.groqApiKey || !localSettings.telegramBotToken || !localSettings.telegramChannelId) {
      setError('All fields are required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await saveSettings(localSettings);
      setSettings(localSettings);
      setSettingsOpen(false);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button 
          onClick={() => setSettingsOpen(false)}
          className="modal-close"
        >
          <X size={24} />
        </button>

        <h2 className="modal-title">
          Settings
        </h2>

        {error && (
          <div className="settings-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <section className="settings-section">
          <div className="section-header">
            <h3 className="section-title">⚡ Groq</h3>
            <span className="encrypted-badge">
              <Lock size={10} /> ENCRYPTED
            </span>
          </div>

          <div className="form-group">
            <label>API Key</label>
            <div className="input-with-toggle">
              <input
                type={showGroqKey ? 'text' : 'password'}
                value={localSettings.groqApiKey}
                onChange={(e) => setLocalSettings({ ...localSettings, groqApiKey: e.target.value })}
                placeholder="gsk_..."
              />
              <button 
                onClick={() => setShowGroqKey(!showGroqKey)}
                className="toggle-button"
              >
                {showGroqKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Model</label>
            <select
              value={localSettings.groqModel}
              onChange={(e) => setLocalSettings({ ...localSettings, groqModel: e.target.value })}
              className="model-select"
            >
              <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
              <option value="llama3-8b-8192">Llama 3 8B</option>
              <option value="qwen-qwq-32b">Qwen 32B</option>
              <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-header">
            <h3 className="section-title">✈️ Telegram</h3>
            <span className="encrypted-badge">
              <Lock size={10} /> ENCRYPTED
            </span>
          </div>

          <div className="form-group">
            <label>Bot Token</label>
            <div className="input-with-toggle">
              <input
                type={showTeleToken ? 'text' : 'password'}
                value={localSettings.telegramBotToken}
                onChange={(e) => setLocalSettings({ ...localSettings, telegramBotToken: e.target.value })}
                placeholder="123456789:ABC..."
              />
              <button 
                onClick={() => setShowTeleToken(!showTeleToken)}
                className="toggle-button"
              >
                {showTeleToken ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Channel ID</label>
            <input
              type="text"
              value={localSettings.telegramChannelId}
              onChange={(e) => setLocalSettings({ ...localSettings, telegramChannelId: e.target.value })}
              placeholder="@mychannel or -100..."
            />
          </div>
        </section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="save-button"
        >
          {saving ? <div className="spinner" style={{ borderTopColor: 'var(--bg)' }} /> : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};
