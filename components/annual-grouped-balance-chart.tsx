import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type AnnualBalanceOrigin = "historico" | "cierre" | "en_curso" | null;

type AnnualBalanceSeries = {
  label: string;
  color: string;
  values: Array<number | null>;
};

const MONTHS = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];
const MONEY = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
export function AnnualGroupedBalanceChart({
  year,
  title,
  description,
  series,
  origins,
}: {
  year: number;
  title: string;
  description: string;
  series: [AnnualBalanceSeries, AnnualBalanceSeries];
  origins: AnnualBalanceOrigin[];
}) {
  const values = series.flatMap((item) => item.values)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const hasData = values.length > 0;
  const tickStep = hasData ? Math.max(100_000, Math.ceil(Math.max(...values) / 7 / 100_000) * 100_000) : 100_000;
  const maximum = hasData ? Math.ceil(Math.max(...values) / tickStep) * tickStep : tickStep;
  const left = 112;
  const right = 1328;
  const top = 20;
  const bottom = 300;
  const groupWidth = (right - left) / 12;
  const barWidth = 30;
  const barGap = 5;
  const barHeight = (value: number) => (Math.max(0, value) / maximum) * (bottom - top);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} {year}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasData ? (
          <>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {series.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="size-3 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden="true" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[1350px]">
                <svg
                  className="w-full"
                  viewBox="0 0 1350 320"
                  role="img"
                  aria-label={`${title} ${year}: barras mensuales de ${series.map((item) => item.label).join(" y ")}`}
                >
                  {Array.from({ length: Math.round(maximum / tickStep) + 1 }, (_, index) => {
                    const value = index * tickStep;
                    const coordinate = bottom - (value / maximum) * (bottom - top);
                    return (
                      <g key={value}>
                        <line x1={left} x2={right} y1={coordinate} y2={coordinate} stroke="#d1d5db" />
                        <text x={left - 10} y={coordinate + 4} textAnchor="end" fill="#6b7280" fontSize="12">
                          {MONEY.format(value)}
                        </text>
                      </g>
                    );
                  })}
                  {MONTHS.map((month, index) => series.map((item, seriesIndex) => {
                    const value = item.values[index];
                    if (value == null) return null;

                    const height = barHeight(value);
                    const center = left + (index + 0.5) * groupWidth;
                    const barX = center + (seriesIndex === 0 ? -barWidth - barGap / 2 : barGap / 2);

                    return (
                      <rect
                        key={`${month}-${item.label}`}
                        x={barX}
                        y={bottom - height}
                        width={barWidth}
                        height={height}
                        rx="2"
                        fill={item.color}
                      >
                        <title>{`${month} ${year} · ${item.label}: ${MONEY.format(value)}`}</title>
                      </rect>
                    );
                  }))}
                </svg>
                <table className="w-full table-fixed border-collapse text-center text-[11px] tabular-nums">
                  <caption className="sr-only">{title} {year}: importes mensuales</caption>
                  <colgroup>
                    <col style={{ width: `${left}px` }} />
                    {MONTHS.map((month) => <col key={month} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="border border-border px-1 py-2" scope="col" />
                      {MONTHS.map((month) => (
                        <th key={month} className="border border-border px-1 py-2 font-semibold" scope="col">{month}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((item) => (
                      <tr key={item.label}>
                        <th className="border border-border px-2 py-2 text-left font-semibold" scope="row">
                          <span className="mr-2 inline-block size-2 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden="true" />
                          {item.label.toUpperCase()}
                        </th>
                        {MONTHS.map((month, index) => {
                          const value = item.values[index];
                          return (
                            <td key={month} className="border border-border px-1 py-2">
                              {value == null ? "—" : MONEY.format(value)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {origins.includes("en_curso") && (
              <p className="text-xs text-muted-foreground">El importe del mes en curso es provisional hasta confirmar el cierre.</p>
            )}
          </>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">Todavía no hay valores para {year}.</p>
        )}
      </CardContent>
    </Card>
  );
}
