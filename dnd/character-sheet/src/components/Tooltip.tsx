import React, { useState, useRef, useEffect, type ReactNode } from 'react';
import ReactDOM from 'react-dom';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  delay?: number;
  defaultPosition?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({ 
    content, 
    children, 
    delay = 300, 
    defaultPosition = 'top' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<'top' | 'bottom'>(defaultPosition);
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const showTooltip = () => {
    timeoutRef.current = window.setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let newPlacement = defaultPosition;
        
        // Simple Viewport Check for vertical clipping
        // We assume a tooltip height of approx 40px for calculation safety, 
        // actual height is dynamic but this is a heuristic for placement flipping.
        if (defaultPosition === 'top' && rect.top < 50) {
            newPlacement = 'bottom';
        } else if (defaultPosition === 'bottom' && rect.bottom > window.innerHeight - 50) {
            newPlacement = 'top';
        }

        setPlacement(newPlacement);

        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        let top = 0;
        // Horizontal center
        const left = rect.left + rect.width / 2 + scrollX;

        if (newPlacement === 'top') {
            top = rect.top + scrollY - 8; // 8px gap
        } else {
            top = rect.bottom + scrollY + 8;
        }

        setPosition({ top, left });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>

      {isVisible && ReactDOM.createPortal(
        <div 
            style={{
                position: 'absolute',
                top: position.top,
                left: position.left,
                transform: `translateX(-50%) ${placement === 'top' ? 'translateY(-100%)' : ''}`,
                background: '#111',
                border: '1px solid #444',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 10000,
                boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                animation: 'fadeIn 0.2s ease-out'
            }}
        >
            {content}
            <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </div>,
        document.body
      )}
    </>
  );
};
