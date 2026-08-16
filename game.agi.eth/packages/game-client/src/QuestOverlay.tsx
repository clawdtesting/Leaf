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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff',
        padding: '2rem',
        borderRadius: '8px',
        textAlign: 'center',
        maxWidth: '80%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        {questInProgress ? (
          <>
            <h2>Quest in Progress</h2>
            <p>Find 10 Robinhood Chain projects – Scouts dispatched…</p>
            {onClose && <button onClick={onClose} style={{marginTop: '1rem', padding: '0.5rem 1rem'}}>
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
            {onClose && <button onClick={onClose} style={{marginTop: '1rem', padding: '0.5rem 1rem'}}>
              Close
            </button>}
          </>
        )}
      </div>
    </div>
  );
};