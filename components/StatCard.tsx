
import React, { ReactNode } from 'react';

interface Props {
  title: string;
  value: string;
  icon: ReactNode;
  color: 'blue' | 'amber' | 'emerald' | 'rose' | 'slate';
}

const StatCard: React.FC<Props> = ({ title, value, icon, color }) => {
  const bgColors = {
    blue: 'bg-blue-50',
    amber: 'bg-amber-50',
    emerald: 'bg-emerald-50',
    rose: 'bg-rose-50',
    slate: 'bg-slate-50',
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${bgColors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;
