import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import './CommentCard.css';

interface CommentCardProps {
  index: number;
  text: string;
  delay: number;
}

export const CommentCard: React.FC<CommentCardProps> = ({ index, text, delay }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="comment-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="index">
        {String(index + 1).padStart(2, '0')}
      </div>
      
      <div className="content">
        {text}
      </div>

      <button 
        onClick={handleCopy}
        className={`copy-button ${copied ? 'copied' : ''}`}
        title="Copy to clipboard"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
};
