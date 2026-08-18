import React from 'react';

interface QuestOverlayProps {
  questInProgress: boolean;
  questCompleted: boolean;
  resultData?: any;
  onClose?: () => void;
}

export const QuestOverlay: React.FC<QuestOverlayProps> = ({
  questInProgress,
  questCompleted,
  resultData,
  onClose
}) => {
  if (!questInProgress && !questCompleted) return null;
  return (
    <div className="zelda-overlay">
      <div className="zelda-card" style={{ textAlign: 'center' }}>
        {questInProgress ? (
          <>
            <h2>Quest in Progress</h2>
            <p>Find 10 Robinhood Chain projects – Scouts dispatched…</p>
            {onClose && <button className="zelda-button" onClick={onClose} style={{marginTop: '1rem'}}>
              Close
            </button>}
          </>
        ) : (
          <>
            <h2>Quest Completed</h2>
            {resultData && resultData.message && <p>{resultData.message}</p>}
            {resultData && Array.isArray(resultData.data) && (
              <ul style={{textAlign: 'left', display: 'inline-block'}}>
                {resultData.data.map((project: string, index: number) => (
                  <li key={index}>{project}</li>
                ))}
              </ul>
            )}
            {onClose && <button className="zelda-button" onClick={onClose} style={{marginTop: '1rem'}}>
              Close
            </button>}
          </>
        )}
      </div>
    </div>
  );
};
