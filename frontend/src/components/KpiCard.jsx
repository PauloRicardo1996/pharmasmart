import React from 'react';

export default function KpiCard({ label, value, meta, tone='' }) { return <div className="kpi-card"><div className="kpi-label">{label}</div><div className={`kpi-value ${tone}`}>{value}</div><div className="kpi-meta">{meta}</div></div>; }
