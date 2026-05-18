import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/layout/Protected";
import { PageHeader } from "@/components/layout/AppLayout";
import { useStore, formatBRL } from "@/lib/store";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { DollarSign, ShoppingBag, Receipt, Package, Factory } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <Protected>
      <DashboardPage />
    </Protected>
  ),
});

function StatCard({
  title,
  value,
  icon: Icon,
  accent = "primary",
}: {
  title: string;
  value: string;
  icon: any;
  accent?: "primary" | "success" | "warning" | "accent";
}) {
  const accentMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    accent: "bg-accent text-accent-foreground",
  };
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${accentMap[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function DashboardPage() {
  const { data } = useStore();

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = data.transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthRevenue = thisMonth.filter((t) => t.type === "entrada").reduce((s, t) => s + t.amount, 0);
    const totalRevenue = data.transactions.filter((t) => t.type === "entrada").reduce((s, t) => s + t.amount, 0);
    const salesCount = data.sales.length;
    const ticket = salesCount > 0 ? data.sales.reduce((s, x) => s + x.total, 0) / salesCount : 0;
    const produced = data.production.filter((p) => p.status === "finalizado").length;
    const stockQty = data.stock.reduce((s, x) => s + x.quantity, 0);
    return { monthRevenue, totalRevenue, salesCount, ticket, produced, stockQty };
  }, [data]);

  const chartData = useMemo(() => {
    // últimos 7 dias
    const days: { day: string; vendas: number; receita: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const dayS = data.sales.filter((s) => s.date.slice(0, 10) === key);
      days.push({
        day: label,
        vendas: dayS.length,
        receita: dayS.reduce((acc, x) => acc + x.total, 0),
      });
    }
    return days;
  }, [data]);

  return (
    <>
      <PageHeader title="Painel" subtitle="Visão geral do seu negócio em tempo real." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Faturamento (mês)" value={formatBRL(stats.monthRevenue)} icon={DollarSign} accent="primary" />
        <StatCard title="Faturamento total" value={formatBRL(stats.totalRevenue)} icon={DollarSign} accent="success" />
        <StatCard title="Vendas" value={String(stats.salesCount)} icon={ShoppingBag} accent="accent" />
        <StatCard title="Ticket médio" value={formatBRL(stats.ticket)} icon={Receipt} accent="primary" />
        <StatCard title="Peças produzidas" value={String(stats.produced)} icon={Factory} accent="warning" />
        <StatCard title="Em estoque" value={String(stats.stockQty)} icon={Package} accent="accent" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="bg-card rounded-2xl p-5 border border-border shadow-[var(--shadow-soft)]">
          <h3 className="font-semibold mb-4">Vendas (últimos 7 dias)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="vendas" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border shadow-[var(--shadow-soft)]">
          <h3 className="font-semibold mb-4">Receita (últimos 7 dias)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => formatBRL(v)} />
                <Line type="monotone" dataKey="receita" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}