import React, { useEffect, useRef } from 'react';
import { useAppStore, Mood, Comment } from './store/useAppStore';
import { useTauri } from './hooks/useTauri';
import { Settings, Send, Plus, Minus, Hash, Info, AlertTriangle, Square, Trash2 } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { CommentCard } from './components/CommentCard';
import { FeedbackBar } from './components/FeedbackBar';
import { StatusBar } from './components/StatusBar';
import './App.css';

const moods: { id: Mood; label: string }[] = [
  { id: 'hype', label: 'Hype' },
  { id: 'curious', label: 'Curious' },
  { id: 'funny', label: 'Funny' },
  { id: 'sincere', label: 'Sincere' },
  { id: 'controversial', label: 'Spicy' },
  { id: 'rage_bait', label: 'Rage Bait' },
];

function App() {
  const {
    settings, setSettings,
    settingsLoaded, setSettingsLoaded,
    reelUrl, setReelUrl,
    mood, setMood,
    commentCount, setCommentCount,
    targetLanguage, setTargetLanguage,
    captions, setCaptions,
    captionsSource, setCaptionsSource,
    comments, setComments,
    status, setStatus,
    setErrorMessage,
    settingsOpen, setSettingsOpen,
    isSettingsComplete,
  } = useAppStore();

  const { loadSettings, fetchCaptions, generateComments, sendToTelegram } = useTauri();
  const generationIdRef = useRef(0);

  useEffect(() => {
    const init = async () => {
      try {
        const s = await loadSettings();
        setSettings(s);
        setSettingsLoaded(true);
        if (!s.groqApiKey || !s.telegramBotToken || !s.telegramChannelId) {
          setSettingsOpen(true);
        }
      } catch (e: any) {
        console.error('Failed to load settings', e);
        setSettingsLoaded(true);
        setSettingsOpen(true);
      }
    };
    init();
  }, []);

  const handleStop = () => {
    generationIdRef.current++;
    setStatus('idle');
  };

  const handleClear = () => {
    generationIdRef.current++;
    setReelUrl('');
    setCaptions('');
    setComments([]);
    setFeedback('');
    setStatus('idle');
  };

  const handleGenerate = async () => {
    if (!reelUrl) {
      setErrorMessage('Please enter an Instagram Reel URL');
      return;
    }

    if (!isSettingsComplete()) {
      setSettingsOpen(true);
      return;
    }

    const currentId = ++generationIdRef.current;

    try {
      setStatus('fetching_captions');
      const { captions: fetchedCaptions, source: fetchedSource } = await fetchCaptions(reelUrl, settings.groqApiKey);
      if (currentId !== generationIdRef.current) return;
      setCaptions(fetchedCaptions);
      setCaptionsSource(fetchedSource);

      setStatus('generating');
      const { comments: aiComments } = await generateComments(
        fetchedCaptions,
        mood,
        commentCount,
        targetLanguage,
        '', // initial feedback is empty
        settings.groqApiKey,
        settings.groqModel
      );

      if (currentId !== generationIdRef.current) return;
      setComments(aiComments.map((text, i) => ({ id: `${Date.now()}-${i}`, text })));
      setStatus('idle');
    } catch (e: any) {
      if (currentId === generationIdRef.current) {
        setErrorMessage(e.toString());
      }
    }
  };

  const handleRegenerate = async () => {
    const { feedback } = useAppStore.getState();
    const currentId = ++generationIdRef.current;
    
    try {
      setStatus('generating');
      const { comments: aiComments } = await generateComments(
        captions,
        mood,
        commentCount,
        targetLanguage,
        feedback,
        settings.groqApiKey,
        settings.groqModel
      );

      if (currentId !== generationIdRef.current) return;
      setComments(aiComments.map((text, i) => ({ id: `${Date.now()}-${i}`, text })));
      setStatus('idle');
    } catch (e: any) {
      if (currentId === generationIdRef.current) {
        setErrorMessage(e.toString());
      }
    }
  };

  const handleSendToTelegram = async () => {
    try {
      setStatus('sending');
      await sendToTelegram(
        comments.map(c => c.text),
        settings.telegramBotToken,
        settings.telegramChannelId
      );
      setStatus('done');
    } catch (e: any) {
      setErrorMessage(e.toString());
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          <span className="accent">◈</span> ReelComment
        </h1>
        <div className="header-actions">
          {!isSettingsComplete() && (
            <span className="setup-warning">
              <AlertTriangle size={14} /> Setup required
            </span>
          )}
          <button 
            onClick={handleClear}
            className="settings-btn"
            title="Clear all"
            style={{ marginRight: '8px' }}
          >
            <Trash2 size={20} />
          </button>
          <button 
            onClick={() => setSettingsOpen(true)}
            className="settings-btn"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <div className="input-section">
          <label className="section-label">Reel URL</label>
          <input
            type="text"
            placeholder="https://www.instagram.com/reels/..."
            value={reelUrl}
            onChange={(e) => setReelUrl(e.target.value)}
            className="reel-input"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '24px', marginBottom: '32px', alignItems: 'end' }}>
          <div>
            <label className="section-label">Select Mood</label>
            <div className="mood-selector">
              {moods.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMood(m.id)}
                  className={`mood-btn ${mood === m.id ? 'active' : ''}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="section-label">Language</label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="stepper"
              style={{ padding: '10px', fontSize: '14px', outline: 'none', appearance: 'none', cursor: 'pointer', minWidth: '120px', color: 'var(--accent)', fontWeight: 'bold' }}
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="Portuguese">Portuguese</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Italian">Italian</option>
              <option value="Japanese">Japanese</option>
            </select>
          </div>

          <div>
            <label className="section-label">Count</label>
            <div className="stepper">
              <button 
                onClick={() => setCommentCount(Math.max(1, commentCount - 1))}
                className="stepper-btn"
              >
                <Minus size={16} />
              </button>
              <div className="stepper-value">
                {commentCount}
              </div>
              <button 
                onClick={() => setCommentCount(Math.min(20, commentCount + 1))}
                className="stepper-btn"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {status === 'fetching_captions' || status === 'generating' ? (
          <button
            onClick={handleStop}
            className="generate-btn stop-btn"
          >
            <Square size={18} fill="currentColor" /> Stop Generation
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={status !== 'idle' && status !== 'done' && status !== 'error'}
            className="generate-btn"
          >
            Generate Comments
          </button>
        )}

        <StatusBar />

        {comments.length > 0 && (
          <div className="preview-section">
            <div className="preview-header">
              <h2 className="preview-title">
                Preview <span className="preview-count">({comments.length})</span>
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--surface2)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={12} /> Data Source: {captionsSource}
              </div>
            </div>
            
            <div className="comments-list">
              {comments.map((c, i) => (
                <CommentCard key={c.id} index={i} text={c.text} delay={i * 80} />
              ))}
            </div>

            <FeedbackBar 
              onRegenerate={handleRegenerate} 
              onSend={handleSendToTelegram}
              isLoading={status === 'generating' || status === 'sending'} 
            />
          </div>
        )}
      </main>

      {settingsOpen && <SettingsModal />}
      
      <footer className="app-footer">
        <p className="footer-text">
          Built with Tauri + Groq + Telegram
        </p>
      </footer>
    </div>
  );
}

export default App;
