import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Check, AlertCircle, X } from 'lucide-react';
import './StatusBar.css';

export const StatusBar: React.FC = () => {
  const { status, setStatus, errorMessage } = useAppStore();

  if (status === 'idle') return null;

  return (
    <div className={`status-bar ${status === 'error' ? 'error' : ''}`}>
      {status === 'fetching_captions' && (
        <>
          <div className="spinner" />
          <span>Fetching captions from Instagram...</span>
        </>
      )}
      {status === 'generating' && (
        <>
          <div className="spinner" />
          <span>Generating AI comments...</span>
        </>
      )}
      {status === 'sending' && (
        <>
          <div className="spinner" />
          <span>Sending to Telegram...</span>
        </>
      )}
      {status === 'done' && (
        <>
          <Check size={18} color="var(--green)" />
          <span className="success-text">Success! Comments sent to Telegram.</span>
          <button 
            onClick={() => setStatus('idle')}
            className="close-btn"
            title="Close"
            style={{ marginLeft: '12px' }}
          >
            <X size={16} />
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle size={18} color="var(--red)" />
          <span className="error-text">{errorMessage}</span>
          <button 
            onClick={() => setStatus('idle')}
            className="close-btn"
            title="Close"
          >
            <X size={16} />
          </button>
        </>
      )}
    </div>
  );
};
