type ChartPoint = {
  date: Date;
  value: number;
  label?: string;
};

type ChartSeries = {
  label: string;
  tone: "teal" | "orange" | "muted";
  dashed?: boolean;
  points: ChartPoint[];
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
});

const toneColor: Record<ChartSeries["tone"], string> = {
  teal: "#087d82",
  orange: "#f08a32",
  muted: "#9aaeb2",
};

export function GrowthChart({
  series,
  height = 250,
  showPointLabels = false,
}: {
  series: ChartSeries[];
  height?: number;
  showPointLabels?: boolean;
}) {
  const populated = series.filter((item) => item.points.length > 0);
  const allPoints = populated.flatMap((item) => item.points);

  if (allPoints.length === 0) {
    return <div className="chartEmpty">Belum ada data pertumbuhan.</div>;
  }

  const minTime = Math.min(...allPoints.map((point) => point.date.getTime()));
  const maxTime = Math.max(...allPoints.map((point) => point.date.getTime()));
  const rawMax = Math.max(...allPoints.map((point) => point.value), 100);
  const maxValue = Math.max(100, Math.ceil(rawMax / 100) * 100);

  // A wider viewBox keeps desktop charts compact vertically as the workspace grows.
  // This mirrors the approved redesign mockup instead of letting SVG height balloon
  // proportionally on wide monitors.
  const width = 1000;
  const left = 52;
  const right = 24;
  const top = 20;
  const bottom = 44;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const timeSpan = Math.max(maxTime - minTime, 1);
  const x = (date: Date) => left + ((date.getTime() - minTime) / timeSpan) * plotWidth;
  const y = (value: number) => top + plotHeight - (value / maxValue) * plotHeight;
  const gridCount = 4;

  const distinctDates = [
    ...new Map(
      allPoints
        .slice()
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((point) => [point.date.getTime(), point.date] as const),
    ).values(),
  ];
  const labelDates =
    distinctDates.length <= 6
      ? distinctDates
      : distinctDates.filter(
          (_, index) =>
            index % Math.ceil(distinctDates.length / 6) === 0 ||
            index === distinctDates.length - 1,
        );

  return (
    <div className="chartWrap">
      <div className="chartLegend">
        {populated.map((item) => (
          <span key={item.label}>
            <i
              className={`legendLine ${item.dashed ? "dashed" : ""}`}
              style={{ color: toneColor[item.tone] }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <svg
        className="growthChart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Grafik perkembangan bobot sampling"
      >
        {Array.from({ length: gridCount + 1 }, (_, index) => {
          const value = (maxValue / gridCount) * index;
          const gy = y(value);
          return (
            <g key={value}>
              <line
                x1={left}
                x2={width - right}
                y1={gy}
                y2={gy}
                className="chartGridLine"
              />
              <text
                x={left - 12}
                y={gy + 4}
                textAnchor="end"
                className="chartAxisText"
              >
                {Math.round(value)}
              </text>
            </g>
          );
        })}

        {labelDates.map((date) => (
          <text
            key={date.getTime()}
            x={x(date)}
            y={height - 11}
            textAnchor="middle"
            className="chartAxisText"
          >
            {dateFormatter.format(date)}
          </text>
        ))}

        {populated.map((item) => {
          const sorted = item.points
            .slice()
            .sort((a, b) => a.date.getTime() - b.date.getTime());
          const path = sorted
            .map(
              (point, index) =>
                `${index === 0 ? "M" : "L"}${x(point.date).toFixed(2)},${y(point.value).toFixed(2)}`,
            )
            .join(" ");
          return (
            <g key={item.label}>
              <path
                d={path}
                fill="none"
                stroke={toneColor[item.tone]}
                strokeWidth="2.4"
                strokeDasharray={item.dashed ? "6 6" : undefined}
                vectorEffect="non-scaling-stroke"
              />
              {!item.dashed
                ? sorted.map((point) => (
                    <g key={`${item.label}-${point.date.getTime()}`}>
                      <circle
                        cx={x(point.date)}
                        cy={y(point.value)}
                        r="4"
                        fill={toneColor[item.tone]}
                      />
                      {showPointLabels ? (
                        <text
                          x={x(point.date)}
                          y={y(point.value) - 11}
                          textAnchor="middle"
                          className="chartPointLabel"
                        >
                          {point.label ?? `${Math.round(point.value)}g`}
                        </text>
                      ) : null}
                    </g>
                  ))
                : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
