
import React, { ReactNode } from 'react';

interface Props {
  title: string;
  value: string;
  icon: ReactNode;
  color: 'blue' | 'amber' | 'emerald' | 'rose' | 'indigo' | 'slate';
  subtitle?: string;
}

const StatCard: React.FC<Props> = ({ title, value, icon, color, subtitle }) => {
  const themes = {
    blue: 'from-blue-600 to-blue-400 text-blue-100 border-blue-400/20',
    amber: 'from-amber-600 to-amber-400 text-amber-100 border-amber-400/20',
    emerald: 'from-emerald-600 to-emerald-400 text-emerald-100 border-emerald-400/20',
    rose: 'from-rose-600 to-rose-400 text-rose-100 border-rose-400/20',
    indigo: 'from-indigo-600 to-indigo-400 text-indigo-100 border-indigo-400/20',
    slate: 'from-slate-700 to-slate-500 text-slate-100 border-slate-400/20',
  };

  const bgThemes = {
    blue: 'bg-blue-50/50',
    amber: 'bg-amber-50/50',
    emerald: 'bg-emerald-50/50',
    rose: 'bg-rose-50/50',
    indigo: 'bg-indigo-50/50',
    slate: 'bg-slate-50/50',
  };

  return (
    <div className={`premium-card group relative p-4 ${bgThemes[color]}`}>
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate mr-2">{title}</p>
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${themes[color]} flex items-center justify-center shadow-sm shrink-0`}>
            {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4 text-white' })}
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-900 tracking-tight font-lexend whitespace-nowrap tabular-nums sm:text-lg lg:text-xl">
          {value}
        </h3>

        {subtitle && (
          <p className="text-[9px] font-medium text-slate-500 mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};


export default StatCard;
