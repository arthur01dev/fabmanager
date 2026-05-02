import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/layout/Protected";
import { PageHeader } from "@/components/layout/AppLayout";
import { useStore, formatBRL } from "@/lib/store";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line,
} from "recharts";

export const Route = createFileRoute("/relatorios")({
  component: () => (
    <Protected>
      <RelatoriosPage />
    </Protected>
  ),
});

type Period = "day" | "week" | "month" | "custom";

function RelatoriosPage() {
  const { data } = useStore();
  const [period, setPeriod] = useState<Period>("month");
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate, setEndDate] = useState(today);

  const range = useMemo(() => {
    const now = new Date();
    if (period === "custom") {
      const s = new Date(startDate + "T00:00:00");
      const e = new Date(endDate + "T23:59:59");
      return { start: s, end: e };
    }
    const s = new Date(now);
    if (period === "day") s.setHours(0, 0, 0, 0);
    else if (period === "week") s.setDate(now.getDate() - 7);
    else s.setMonth(now.getMonth() - 1);
    return { start: s, end: now };
  }, [period, startDate, endDate]);

  const stats = useMemo(() => {
    const startISO = range.start.toISOString();
    const endISO = range.end.toISOString();
    const inRange = (d: string) => d >= startISO && d <= endISO;
    const sales = data.sales.filter((s) => inRange(s.date));
    const txs = data.transactions.filter((t) => inRange(t.date));

    const totalSales = sales.length;
    const salesRevenue = sales.reduce((s, x) => s + x.total, 0);
    const manualIncome = txs.filter(t => t.type === 'entrada' && !t.sale_id).reduce((s, t) => s + t.amount, 0);
    
    const totalRevenue = salesRevenue + manualIncome;
    const ticket = totalSales > 0 ? salesRevenue / totalSales : 0;
    const expenses = txs.filter((t) => t.type === "saida").reduce((s, t) => s + t.amount, 0);
    
    const grossProfit = totalRevenue;
    const netProfit = totalRevenue - expenses;
    return { totalSales, revenue: totalRevenue, ticket, grossProfit, netProfit, expenses };
  }, [data, range]);

  const series = useMemo(() => {
    const arr: { label: string; receita: number; vendas: number }[] = [];
    if (period === "day") {
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 3600000);
        const hour = d.getHours();
        const ds = data.sales.filter((s) => {
          const sDate = new Date(s.date);
          return sDate.getDate() === d.getDate() && sDate.getHours() === hour;
        });
        arr.push({ label: hour.toString().padStart(2, "0") + "h", receita: ds.reduce((a, x) => a + x.total, 0), vendas: ds.length });
      }
      return arr;
    }
    const startDay = new Date(range.start); startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(range.end); endDay.setHours(0, 0, 0, 0);
    const days = Math.min(366, Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / 86400000) + 1));
    for (let i = 0; i < days; i++) {
      const d = new Date(startDay); d.setDate(startDay.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const ds = data.sales.filter((s) => s.date.slice(0, 10) === key);
      arr.push({
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        receita: ds.reduce((a, x) => a + x.total, 0),
        vendas: ds.length,
      });
    }
    return arr;
  }, [data, period, range]);

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Indicadores e tendências do negócio." />

      <div className="flex flex-wrap gap-3 items-center mb-6">
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
          {(["day", "week", "month", "custom"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 h-9 rounded-md text-sm font-medium transition ${period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p === "day" ? "Dia" : p === "week" ? "Semana" : p === "month" ? "Mês" : "Personalizado"}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex gap-2 items-center bg-card border border-border rounded-lg p-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 px-2 rounded-md border border-input bg-background text-sm" />
            <span className="text-muted-foreground text-sm">até</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 px-2 rounded-md border border-input bg-background text-sm" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total de vendas" value={String(stats.totalSales)} />
        <Stat label="Ticket médio" value={formatBRL(stats.ticket)} />
        <Stat label="Lucro bruto" value={formatBRL(stats.grossProfit)} tone="success" />
        <Stat label="Lucro líquido" value={formatBRL(stats.netProfit)} tone={stats.netProfit >= 0 ? "success" : "destructive"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h3 className="font-semibold mb-4">Receita</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => formatBRL(v)} />
                <Line type="monotone" dataKey="receita" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h3 className="font-semibold mb-4">Vendas</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="vendas" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, tone = "foreground" }: { label: string; value: string; tone?: "foreground" | "success" | "destructive" }) {
  const cls = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="bg-card rounded-2xl p-5 border border-border">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${cls}`}>{value}</div>
    </div>
  );
}