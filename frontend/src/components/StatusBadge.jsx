import React from 'react';

export function Chip({ children, tone='blue' }) { return <span className={`chip chip-${tone}`}>{children}</span>; }
export function Status({ children, tone='green' }) { return <span className="status-dot"><span className={`dot dot-${tone}`} />{children}</span>; }
