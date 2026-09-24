import React, { useState } from 'react';

export interface PieChartSlice {
  label: string;
  value: number;
  color: string;
  subtext?: string;
  id?: string;
}

interface PieChartProps {
  data: PieChartSlice[];
  size?: number;
  donutRadiusRatio?: number; // 0 for solid pie, 0.55 for donut
  centerTitle?: string;
  centerSubtitle?: string;
  onSliceClick?: (slice: PieChartSlice) => void;
  selectedLabel?: string | null;
  className?: string;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  size = 240,
  donutRadiusRatio = 0.58,
  centerTitle,
  centerSubtitle,
  onSliceClick,
  selectedLabel,
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalValue = data.reduce((sum, item) => sum + (item.value || 0), 0);

  if (totalValue <= 0 || data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 text-center ${className}`}>
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={(size / 2) * (1 + donutRadiusRatio) / 2}
              fill="none"
              stroke="currentColor"
              strokeWidth={(size / 2) * (1 - donutRadiusRatio)}
              strokeDasharray="4 4"
              className="text-teal-300/60 dark:text-emerald-950"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-2 text-center">
            <span className="text-xs font-mono font-bold text-violet-950 dark:text-slate-200">
              0 LOGS
            </span>
            <span className="text-[10px] text-teal-700 dark:text-cyan-400 font-bold mt-0.5">
              READY FOR DATA
            </span>
          </div>
        </div>
        <p className="text-xs text-violet-950 dark:text-slate-300 mt-3 font-medium">
          Awaiting field observation entries.
        </p>
      </div>
    );
  }

  const radius = size / 2;
  const innerRadius = radius * donutRadiusRatio;
  const center = radius;

  // Calculate arc slices
  let accumulatedAngle = -Math.PI / 2; // start at top (12 o'clock)

  const slices = data.map((item, index) => {
    const fraction = item.value / totalValue;
    const angle = fraction * 2 * Math.PI;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + angle;
    accumulatedAngle = endAngle;

    // Outer arc points
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    // Inner arc points (for donut)
    const ix1 = center + innerRadius * Math.cos(endAngle);
    const iy1 = center + innerRadius * Math.sin(endAngle);
    const ix2 = center + innerRadius * Math.cos(startAngle);
    const iy2 = center + innerRadius * Math.sin(startAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    let pathData = '';
    // SVG Arc quirk fix: An arc from angle A to A + 2*PI has identical start and end points,
    // which causes the SVG parser to drop the arc completely. We must handle full circle / donut rings explicitly!
    if (fraction >= 0.999 || data.length === 1) {
      if (innerRadius > 0) {
        pathData = [
          `M ${center} ${center - radius}`,
          `A ${radius} ${radius} 0 1 1 ${center} ${center + radius}`,
          `A ${radius} ${radius} 0 1 1 ${center} ${center - radius}`,
          `M ${center} ${center - innerRadius}`,
          `A ${innerRadius} ${innerRadius} 0 1 0 ${center} ${center + innerRadius}`,
          `A ${innerRadius} ${innerRadius} 0 1 0 ${center} ${center - innerRadius}`,
          'Z',
        ].join(' ');
      } else {
        pathData = [
          `M ${center} ${center - radius}`,
          `A ${radius} ${radius} 0 1 1 ${center} ${center + radius}`,
          `A ${radius} ${radius} 0 1 1 ${center} ${center - radius}`,
          'Z',
        ].join(' ');
      }
    } else if (innerRadius > 0) {
      pathData = [
        `M ${x1.toFixed(3)} ${y1.toFixed(3)}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`,
        `L ${ix1.toFixed(3)} ${iy1.toFixed(3)}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix2.toFixed(3)} ${iy2.toFixed(3)}`,
        'Z',
      ].join(' ');
    } else {
      pathData = [
        `M ${center} ${center}`,
        `L ${x1.toFixed(3)} ${y1.toFixed(3)}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`,
        'Z',
      ].join(' ');
    }

    const percentage = ((item.value / totalValue) * 100).toFixed(1);

    return {
      ...item,
      percentage,
      pathData,
      index,
    };
  });

  // Center active display: either hovered, or if single slice, highlight that slice
  const activeSlice =
    hoveredIndex !== null
      ? slices[hoveredIndex]
      : selectedLabel
      ? slices.find((s) => s.label === selectedLabel) || null
      : slices.length === 1
      ? slices[0]
      : null;

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-6 ${className}`}>
      {/* SVG Container */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible select-none drop-shadow-2xs"
        >
          {/* Subtle background track for ring */}
          {innerRadius > 0 && (
            <circle
              cx={center}
              cy={center}
              r={(radius + innerRadius) / 2}
              fill="none"
              stroke="currentColor"
              strokeWidth={radius - innerRadius}
              className="text-sky-100 dark:text-emerald-950/50"
            />
          )}

          {slices.map((slice) => {
            const isHovered = hoveredIndex === slice.index;
            const isSelected = selectedLabel === slice.label;

            return (
              <path
                key={slice.label}
                d={slice.pathData}
                fill={slice.color}
                fillRule="evenodd"
                stroke={
                  isSelected
                    ? '#0284c7'
                    : isHovered
                    ? '#0f172a'
                    : 'currentColor'
                }
                strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.5}
                className={`transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'text-sky-600 dark:text-cyan-400 opacity-100'
                    : isHovered
                    ? 'text-slate-900 dark:text-white opacity-100'
                    : 'text-white dark:text-[#0c1a14] opacity-95 hover:opacity-100'
                }`}
                style={{
                  filter: isHovered || isSelected ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))' : 'none',
                }}
                onMouseEnter={() => setHoveredIndex(slice.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSliceClick && onSliceClick(slice)}
              />
            );
          })}
        </svg>

        {/* Center label for donut chart */}
        {innerRadius > 0 && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4"
            style={{
              width: innerRadius * 2,
              height: innerRadius * 2,
              top: radius - innerRadius,
              left: radius - innerRadius,
            }}
          >
            {activeSlice ? (
              <>
                <span className="text-[10px] font-mono uppercase text-violet-950 dark:text-slate-300 font-bold truncate max-w-[110px]">
                  {activeSlice.label}
                </span>
                <span className="text-lg font-black font-mono text-blue-950 dark:text-white">
                  {activeSlice.percentage}%
                </span>
                <span className="text-[10px] font-mono text-blue-950 dark:text-slate-300 font-bold">
                  {activeSlice.value} log{activeSlice.value === 1 ? '' : 's'}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-mono uppercase text-violet-950 dark:text-slate-300 font-bold">
                  {centerSubtitle || 'TOTAL LOGS'}
                </span>
                <span className="text-xl font-black font-mono text-blue-950 dark:text-white">
                  {centerTitle || totalValue}
                </span>
                <span className="text-[9px] font-mono text-teal-700 dark:text-cyan-400 font-bold">
                  EMPIRICAL
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Legend & Breakdown List */}
      <div className="flex-1 w-full space-y-1.5 min-w-[200px]">
        {slices.map((slice) => {
          const isHovered = hoveredIndex === slice.index;
          const isSelected = selectedLabel === slice.label;

          return (
            <div
              key={slice.label}
              onMouseEnter={() => setHoveredIndex(slice.index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onSliceClick && onSliceClick(slice)}
              className={`p-2 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                isSelected
                  ? 'bg-sky-100 dark:bg-emerald-950/80 border-teal-400 dark:border-emerald-600 font-bold shadow-2xs'
                  : isHovered
                  ? 'bg-sky-100/70 dark:bg-[#0c1a14] border-teal-300 dark:border-emerald-800'
                  : 'bg-transparent border-transparent hover:bg-sky-100/50 dark:hover:bg-[#0c1a14]/60'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-black/10 dark:border-white/10"
                  style={{ backgroundColor: slice.color }}
                />
                <div className="truncate">
                  <span className="text-blue-950 dark:text-slate-200 font-bold truncate block">
                    {slice.label}
                  </span>
                  {slice.subtext && (
                    <span className="text-[10px] text-violet-950 dark:text-slate-300 block truncate font-medium">
                      {slice.subtext}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right font-mono shrink-0 pl-2">
                <span className="text-blue-950 dark:text-white font-black text-xs block">
                  {slice.percentage}%
                </span>
                <span className="text-[10px] text-violet-950 dark:text-slate-300 font-bold">
                  {slice.value} records
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
