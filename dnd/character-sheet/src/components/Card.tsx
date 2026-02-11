import React from 'react';


interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  actions?: React.ReactNode;
  style?: React.CSSProperties; 
  onClick?: (e: React.MouseEvent) => void;
}

export const Card: React.FC<CardProps> = ({ children, title, className = '', actions, style, onClick }) => {
  return (
    <div 
      className={`glass-panel p-4 ${className}`} 
      style={{ padding: '1rem', ...style }}
      onClick={onClick}
    >
      {(title || actions) && (
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
          {title && <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};
