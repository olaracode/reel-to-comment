import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { RefreshCcw, Send } from 'lucide-react';
import './FeedbackBar.css';

interface FeedbackBarProps {
  onRegenerate: () => void;
  onSend: () => void;
  isLoading: boolean;
}

export const FeedbackBar: React.FC<FeedbackBarProps> = ({ onRegenerate, onSend, isLoading }) => {
  const { feedback, setFeedback } = useAppStore();

  return (
    <div className="feedback-bar">
      <textarea
        placeholder="Optional feedback for regeneration (e.g. 'make them shorter')..."
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      
      <div className="actions">
        <button
          onClick={onRegenerate}
          disabled={isLoading}
          className="btn btn-secondary"
        >
          <RefreshCcw size={18} className={isLoading ? 'spin' : ''} />
          Regenerate
        </button>

        <button
          onClick={onSend}
          disabled={isLoading}
          className="btn btn-primary"
        >
          <Send size={18} />
          Send to Telegram
        </button>
      </div>
    </div>
  );
};
