import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/layout/Protected";
import { PageHeader } from "@/components/layout/AppLayout";
import { useStore, formatBRL } from "@/lib/store";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line,
} from "recharts";
import { FileSpreadsheet, Printer } from "lucide-react";
import { toast } from "sonner";

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
    const manualIncome = txs.filter(t => t.type === 'entrada' && !t.saleId).reduce((s, t) => s + t.amount, 0);
    
    const totalRevenue = salesRevenue + manualIncome;
    const ticket = totalSales > 0 ? salesRevenue / totalSales : 0;
    const expenses = txs.filter((t) => t.type === "saida").reduce((s, t) => s + t.amount, 0);
    
    const grossProfit = totalRevenue;
    const netProfit = totalRevenue - expenses;
    return { totalSales, revenue: totalRevenue, ticket, grossProfit, netProfit, expenses, sales, txs };
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

  const getSaleCost = (s: any) => {
    const stockItem = data.stock.find((item) => item.id === s.stockItemId);
    if (stockItem) {
      return stockItem.productionCost * s.quantity;
    }
    const prodItem = data.production.find((item) => item.name === s.productName);
    if (prodItem) {
      return prodItem.productionCost * s.quantity;
    }
    return 0;
  };

  const exportToCSV = () => {
    try {
      const startStr = range.start.toLocaleDateString("pt-BR");
      const endStr = range.end.toLocaleDateString("pt-BR");
      
      let csvContent = "\uFEFF"; // UTF-8 BOM para acentuação perfeita no Excel
      
      // Cabeçalhos Administrativos
      csvContent += `FABMANAGER ERP - RELATÓRIO OPERACIONAL E FINANCEIRO\n`;
      csvContent += `Período:;${startStr} até ${endStr}\n`;
      csvContent += `Tipo de Filtro:;${period === "day" ? "Dia" : period === "week" ? "Semana" : period === "month" ? "Mês" : "Personalizado"}\n`;
      csvContent += `Gerado em:;${new Date().toLocaleString("pt-BR")}\n\n`;
      
      // Resumo Financeiro
      csvContent += `RESUMO FINANCEIRO DO PERÍODO\n`;
      csvContent += `Indicador;Valor\n`;
      csvContent += `Total de Vendas;${stats.totalSales}\n`;
      csvContent += `Ticket Médio;${formatBRL(stats.ticket)}\n`;
      csvContent += `Receita Bruta (Faturamento);${formatBRL(stats.revenue)}\n`;
      csvContent += `Despesas Operacionais (Saídas);${formatBRL(stats.expenses)}\n`;
      csvContent += `Lucro Líquido Real;${formatBRL(stats.netProfit)}\n\n`;
      
      // Detalhamento de Vendas
      csvContent += `HISTÓRICO DE VENDAS (PERÍODO FILTRADO)\n`;
      csvContent += `Data;Produto;Cliente;Quantidade;Preço Unitário;Custo Prod. Estimado;Total Venda;Lucro Estimado;Forma de Pagamento\n`;
      
      if (stats.sales.length === 0) {
        csvContent += `Nenhuma venda registrada no período;;;;;;;;\n`;
      } else {
        stats.sales.forEach((s) => {
          const sDate = new Date(s.date).toLocaleDateString("pt-BR");
          const cost = getSaleCost(s);
          const profit = s.total - cost;
          csvContent += `${sDate};"${s.productName.replace(/"/g, '""')}";"${(s.client || "—").replace(/"/g, '""')}";${s.quantity};${formatBRL(s.unitPrice)};${formatBRL(cost / s.quantity)};${formatBRL(s.total)};${formatBRL(profit)};"${s.paymentMethod || "—"}"\n`;
        });
      }
      csvContent += `\n`;
      
      // Lançamentos Financeiros (Fluxo de Caixa)
      csvContent += `FLUXO DE CAIXA / LANÇAMENTOS NO PERÍODO\n`;
      csvContent += `Data;Tipo;Categoria;Descrição;Valor\n`;
      
      if (stats.txs.length === 0) {
        csvContent += `Nenhum lançamento no período;;;;\n`;
      } else {
        stats.txs.forEach((t) => {
          const tDate = new Date(t.date + 'T12:00:00').toLocaleDateString("pt-BR");
          csvContent += `${tDate};${t.type === "entrada" ? "Entrada" : "Saída"};"${t.category.replace(/"/g, '""')}";"${(t.description || "—").replace(/"/g, '""')}";${formatBRL(t.amount)}\n`;
        });
      }
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio_financeiro_${period}_${startStr.replace(/\//g, "-")}_a_${endStr.replace(/\//g, "-")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Planilha Excel (.csv) baixada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao exportar planilha: " + err.message);
    }
  };

  const exportToPDF = () => {
    try {
      const startStr = range.start.toLocaleDateString("pt-BR");
      const endStr = range.end.toLocaleDateString("pt-BR");
      
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Permissão de pop-up bloqueada pelo navegador.");
        return;
      }
      
      const totalCost = stats.sales.reduce((acc, s) => acc + getSaleCost(s), 0);
      const salesProfit = stats.revenue - totalCost;

      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Relatório de Desempenho Administrativo - FabManager</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              color: #1e293b;
              background: #ffffff;
              margin: 0;
              padding: 40px;
              font-size: 13px;
              line-height: 1.5;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 24px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-family: 'Outfit', sans-serif;
              font-size: 26px;
              font-weight: 700;
              color: #6366f1;
              letter-spacing: -0.5px;
            }
            .header p {
              margin: 6px 0 0 0;
              color: #64748b;
              font-size: 14px;
            }
            .meta-info {
              text-align: right;
              font-size: 12px;
              color: #64748b;
              line-height: 1.6;
            }
            .section-title {
              font-family: 'Outfit', sans-serif;
              font-size: 16px;
              font-weight: 600;
              color: #0f172a;
              margin-top: 35px;
              margin-bottom: 15px;
              border-left: 4px solid #6366f1;
              padding-left: 10px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              margin-bottom: 35px;
            }
            .card {
              background: #fafafa;
              border: 1px solid #f1f5f9;
              border-radius: 12px;
              padding: 18px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            }
            .card-label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #64748b;
              font-weight: 600;
            }
            .card-value {
              font-family: 'Outfit', sans-serif;
              font-size: 20px;
              font-weight: 700;
              margin-top: 6px;
              color: #0f172a;
            }
            .card-value.success { color: #10b981; }
            .card-value.danger { color: #ef4444; }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 35px;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0,0,0,0.01);
            }
            th {
              background: #f8fafc;
              font-weight: 600;
              text-align: left;
              padding: 10px 14px;
              border-bottom: 1.5px solid #e2e8f0;
              color: #334155;
              font-size: 12px;
            }
            td {
              padding: 10px 14px;
              border-bottom: 1px solid #f1f5f9;
              color: #475569;
            }
            tr:nth-child(even) td {
              background: #fafafa;
            }
            .badge {
              font-size: 10px;
              background: #f1f5f9;
              color: #475569;
              padding: 3px 8px;
              border-radius: 20px;
              font-weight: 600;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-semibold { font-weight: 600; }
            .footer {
              margin-top: 60px;
              border-top: 1px solid #f1f5f9;
              padding-top: 20px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
            }
            @media print {
              body { padding: 0; }
              .card { background: #fafafa !important; border: 1px solid #f1f5f9 !important; }
              th { background: #f8fafc !important; }
              tr:nth-child(even) td { background: #fafafa !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>FabManager ERP</h1>
              <p>Relatório de Desempenho Administrativo & Financeiro</p>
            </div>
            <div class="meta-info">
              <div><strong>Período:</strong> ${startStr} a ${endStr}</div>
              <div><strong>Filtro Ativo:</strong> ${period === "day" ? "Dia" : period === "week" ? "Semana" : period === "month" ? "Mês" : "Personalizado"}</div>
              <div><strong>Emissão:</strong> ${new Date().toLocaleString("pt-BR")}</div>
            </div>
          </div>

          <div class="section-title">Resumo Financeiro</div>
          <div class="grid">
            <div class="card">
              <div class="card-label">Total de Vendas</div>
              <div class="card-value">${stats.totalSales}</div>
            </div>
            <div class="card">
              <div class="card-label">Ticket Médio</div>
              <div class="card-value">${formatBRL(stats.ticket)}</div>
            </div>
            <div class="card">
              <div class="card-label">Receita Bruta</div>
              <div class="card-value success">${formatBRL(stats.revenue)}</div>
            </div>
            <div class="card">
              <div class="card-label">Lucro Líquido</div>
              <div class="card-value ${stats.netProfit >= 0 ? "success" : "danger"}">${formatBRL(stats.netProfit)}</div>
            </div>
          </div>

          <div class="section-title">Detalhamento de Vendas</div>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Cliente</th>
                <th class="text-center">Qtd</th>
                <th class="text-right">Unitário</th>
                <th class="text-right">Custo Prod.</th>
                <th class="text-right">Total</th>
                <th class="text-right">Lucro Estimado</th>
                <th>Pagamento</th>
              </tr>
            </thead>
            <tbody>
              ${stats.sales.length === 0 
                ? `<tr><td colspan="9" class="text-center" style="padding: 24px; color: #94a3b8;">Nenhuma venda registrada no período selecionado.</td></tr>`
                : stats.sales.map(s => {
                  const cost = getSaleCost(s);
                  const profit = s.total - cost;
                  return `
                    <tr>
                      <td>${new Date(s.date).toLocaleDateString("pt-BR")}</td>
                      <td class="font-semibold" style="color: #0f172a;">${s.productName}</td>
                      <td>${s.client || "—"}</td>
                      <td class="text-center">${s.quantity}</td>
                      <td class="text-right">${formatBRL(s.unitPrice)}</td>
                      <td class="text-right text-muted-foreground">${cost > 0 ? formatBRL(cost / s.quantity) : "—"}</td>
                      <td class="text-right font-semibold" style="color: #10b981;">${formatBRL(s.total)}</td>
                      <td class="text-right font-semibold" style="color: ${profit >= 0 ? "#10b981" : "#ef4444"};">${formatBRL(profit)}</td>
                      <td><span class="badge">${s.paymentMethod || "—"}</span></td>
                    </tr>
                  `;
                }).join("")
              }
            </tbody>
          </table>

          <div class="section-title">Lançamentos Financeiros (Fluxo de Caixa)</div>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th class="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${stats.txs.length === 0
                ? `<tr><td colspan="5" class="text-center" style="padding: 24px; color: #94a3b8;">Nenhum lançamento financeiro registrado no período selecionado.</td></tr>`
                : stats.txs.map(t => `
                  <tr>
                    <td>${new Date(t.date + 'T12:00:00').toLocaleDateString("pt-BR")}</td>
                    <td class="font-semibold" style="color: ${t.type === "entrada" ? "#10b981" : "#ef4444"};">
                      ${t.type === "entrada" ? "Entrada" : "Saída"}
                    </td>
                    <td>${t.category}</td>
                    <td>${t.description || "—"}</td>
                    <td class="text-right font-semibold" style="color: ${t.type === "entrada" ? "#10b981" : "#ef4444"};">
                      ${t.type === "entrada" ? "+" : "−"} ${formatBRL(t.amount)}
                    </td>
                  </tr>
                `).join("")
              }
            </tbody>
          </table>

          <div class="footer">
            FabManager ERP · Relatório gerado de forma automatizada para controle contábil e empresarial.
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      toast.success("Visualização de impressão (PDF) aberta!");
    } catch (err: any) {
      toast.error("Erro ao gerar relatório PDF: " + err.message);
    }
  };

  return (
    <>
      <PageHeader 
        title="Relatórios" 
        subtitle="Indicadores e tendências do negócio." 
        action={
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="h-10 px-4 rounded-lg border border-input bg-card text-foreground hover:bg-muted text-sm font-medium flex items-center gap-2 shadow-[var(--shadow-soft)] transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={exportToPDF}
              className="h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-[var(--shadow-elegant)] transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir PDF</span>
            </button>
          </div>
        }
      />

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