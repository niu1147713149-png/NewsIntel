import type { StockPricePoint } from "@/types/stocks";

interface StockPriceLineChartProps {
  prices: StockPricePoint[];
  height?: number;
  showLabels?: boolean;
  title?: string;
  subtitle?: string;
  labelCount?: number;
}

function formatShortDate(isoString: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(isoString));
}

export function StockPriceLineChart({
  prices,
  height = 220,
  showLabels = true,
  title = "Price Trend",
  subtitle,
  labelCount = 5
}: StockPriceLineChartProps): JSX.Element {
  const values = prices.map((item) => item.close).filter((value): value is number => value !== null);

  if (values.length === 0 || prices.length === 0) {
    return (
      <div className="data-subpanel flex h-[220px] items-center justify-center border border-dashed text-sm text-slate-400">
        暂无价格走势图数据
      </div>
    );
  }

  const width = 100;
  const paddingX = 6;
  const paddingY = 10;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueSpan = maxValue - minValue || 1;

  const points = prices.map((price, index) => {
    const closeValue = price.close ?? minValue;
    const x = prices.length === 1 ? width / 2 : paddingX + (index / (prices.length - 1)) * (width - paddingX * 2);
    const y = paddingY + ((maxValue - closeValue) / valueSpan) * (height - paddingY * 2);
    return { x, y, closeValue, time: price.time };
  });

  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = [`${points[0]?.x},${height - paddingY}`, polylinePoints, `${points[points.length - 1]?.x},${height - paddingY}`].join(" ");
  const firstValue = points[0]?.closeValue ?? minValue;
  const lastValue = points[points.length - 1]?.closeValue ?? firstValue;
  const trendUp = lastValue >= firstValue;
  const lineColor = trendUp ? "#34D399" : "#F87171";
  const fillColor = trendUp ? "rgba(52, 211, 153, 0.16)" : "rgba(248, 113, 113, 0.16)";
  const changeValue = lastValue - firstValue;
  const sampledIndexes = new Set<number>();

  if (showLabels) {
    const targetCount = Math.max(2, Math.min(labelCount, points.length));
    for (let index = 0; index < targetCount; index += 1) {
      const ratio = targetCount === 1 ? 0 : index / (targetCount - 1);
      sampledIndexes.add(Math.round(ratio * (points.length - 1)));
    }
  }

  const labelPoints = points.filter((_, index) => sampledIndexes.has(index));

  return (
    <div className="data-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{lastValue.toFixed(2)}</p>
          <p className={`mt-2 text-xs font-medium ${trendUp ? "text-emerald-300" : "text-rose-300"}`}>
            {changeValue > 0 ? "+" : ""}
            {changeValue.toFixed(2)} vs first point
          </p>
        </div>
        <div className="text-right text-xs text-slate-300">
          {subtitle ? <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">{subtitle}</p> : null}
          <p>区间低点 {minValue.toFixed(2)}</p>
          <p className="mt-1">区间高点 {maxValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="data-subpanel mt-4 overflow-hidden px-2 py-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full" preserveAspectRatio="none" role="img" aria-label="股票价格折线图">
          <defs>
            <linearGradient id="stock-price-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={fillColor} />
              <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
            </linearGradient>
          </defs>

          {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              x2={width}
              y1={paddingY + ratio * (height - paddingY * 2)}
              y2={paddingY + ratio * (height - paddingY * 2)}
              stroke="rgba(100, 116, 139, 0.18)"
              strokeDasharray="1.5 2"
              strokeWidth="0.4"
            />
          ))}

          <polygon points={areaPoints} fill="url(#stock-price-area)" />
          <polyline
            points={polylinePoints}
            fill="none"
            stroke={lineColor}
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((point, index) => (
            <circle
              key={`${point.time}-${index}`}
              cx={point.x}
              cy={point.y}
              r="1.35"
              fill={lineColor}
              stroke="#0B1220"
              strokeWidth="0.6"
            />
          ))}
        </svg>
      </div>
      
      {showLabels ? (
        <div className="mt-3 grid gap-2 text-[11px] text-slate-300" style={{ gridTemplateColumns: `repeat(${labelPoints.length}, minmax(0, 1fr))` }}>
          {labelPoints.map((point) => (
            <div key={point.time} className="text-center">
              <p>{formatShortDate(point.time)}</p>
              <p className="mt-1 tabular-nums text-slate-100">{point.closeValue.toFixed(2)}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
