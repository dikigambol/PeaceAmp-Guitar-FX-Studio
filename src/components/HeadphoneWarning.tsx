import React, { useState } from 'react';
import { Headphones, X } from 'lucide-react';

export const HeadphoneWarning: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="warning-banner">
      <div className="warning-content">
        <Headphones className="warning-icon" size={20} />
        <div>
          <strong>Use Headphones or Audio Interface:</strong>
          <span>
            {' '}When using built-in laptop microphones without headphones, speaker output will feed back into the mic and generate severe acoustic feedback howling.
          </span>
        </div>
      </div>
      <button 
        className="warning-close-btn"
        onClick={() => setDismissed(true)}
        title="Dismiss warning"
      >
        <X size={16} />
      </button>
    </div>
  );
};
