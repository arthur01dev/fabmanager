import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/layout/Protected";
import { PageHeader } from "@/components/layout/AppLayout";
import { useStore, formatBRL } from "@/lib/store";
import { Package, Trash2 } from "lucide-react";

export const Route = createFileRoute("/estoque")({
  component: () => (
    <Protected>
      <EstoquePage />
    </Protected>
  ),
});

function EstoquePage() {
  const { data, removeStockItem } = useStore();
  const items = data.stock.filter((i) => i.quantity > 0);
  const totalValue = items.reduce((s, i) => s + i.quantity * i.suggestedPrice, 0);

  return (
    <>
      <PageHeader title="Estoque" subtitle="Peças prontas disponíveis para venda." />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="text-sm text-muted-foreground">Itens diferentes</div>
          <div className="text-2xl font-bold mt-1">{items.length}</div>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="text-sm text-muted-foreground">Quantidade total</div>
          <div className="text-2xl font-bold mt-1">{items.reduce((s, i) => s + i.quantity, 0)}</div>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="text-sm text-muted-foreground">Valor de venda</div>
          <div className="text-2xl font-bold mt-1 text-success">{formatBRL(totalValue)}</div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="p-3 font-medium">Peça</th>
                <th className="p-3 font-medium text-center">Qtd</th>
                <th className="p-3 font-medium text-center">Filamento</th>
                <th className="p-3 font-medium text-center">Tempo</th>
                <th className="p-3 font-medium text-right">Custo</th>
                <th className="p-3 font-medium text-right">Preço sugerido</th>
                <th className="p-3 font-medium text-right">Margem</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Estoque vazio. Finalize peças na aba Produção.
                </td></tr>
              )}
              {items.map((i) => {
                const margin = i.suggestedPrice - i.productionCost;
                const marginPct = i.productionCost > 0 ? (margin / i.productionCost) * 100 : 0;
                return (
                  <tr key={i.id} className="border-t border-border">
                    <td className="p-3 font-medium">{i.name}</td>
                    <td className="p-3 text-center"><span className="inline-flex h-7 min-w-7 px-2 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">{i.quantity}</span></td>
                    <td className="p-3 text-center text-muted-foreground">{i.filamentGrams || 0}g</td>
                    <td className="p-3 text-center text-muted-foreground">{i.estimatedHours || 0}h</td>
                    <td className="p-3 text-right">{formatBRL(i.productionCost)}</td>
                    <td className="p-3 text-right font-semibold">{formatBRL(i.suggestedPrice)}</td>
                    <td className="p-3 text-right text-success">{formatBRL(margin)} <span className="text-xs text-muted-foreground">({marginPct.toFixed(0)}%)</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}