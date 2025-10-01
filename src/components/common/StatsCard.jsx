import React from 'react';

/** StatsCard - tarjeta genérica de métrica */
const StatsCard = ({
  title,
  value,
  icon: Icon,
  accent = 'slate',
  footer,
  compact = false
}) => {
  const sizes = compact ? {
    wrap: 'p-4',
    iconBox: 'w-8 h-8',
    icon: 'w-4 h-4',
    value: 'text-xl',
    title: 'text-xs'
  } : {
    wrap: 'p-6',
    iconBox: 'w-12 h-12',
    icon: 'w-6 h-6',
    value: 'text-3xl',
    title: 'text-sm'
  };
  const colorMap = {
    slate: { box: 'bg-slate-50', icon: 'text-slate-600' },
    blue: { box: 'bg-blue-50', icon: 'text-blue-600' },
    amber: { box: 'bg-amber-50', icon: 'text-amber-600' },
    emerald: { box: 'bg-emerald-50', icon: 'text-emerald-600' },
    orange: { box: 'bg-orange-50', icon: 'text-orange-600' }
  };
  const color = colorMap[accent] || colorMap.slate;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className={`flex items-start justify-between ${sizes.wrap}`}>
        <div className="flex-1 min-w-0">
          <p className={`font-medium uppercase tracking-wide text-gray-500 ${sizes.title}`}>{title}</p>
          <p className={`font-bold text-gray-900 mt-1 ${sizes.value}`}>{value}</p>
          {footer && <p className="text-xs text-gray-500 mt-2">{footer}</p>}
        </div>
        {Icon && (
          <div className={`${sizes.iconBox} ${color.box} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Icon className={`${sizes.icon} ${color.icon}`} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
