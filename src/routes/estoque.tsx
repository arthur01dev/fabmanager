import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/layout/Protected";
import { PageHeader } from "@/components/layout/AppLayout";
import { useStore, formatBRL } from "@/lib/store";
import type { StockItem } from "@/lib/types";
import { useState } from "react";
import { Package, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/estoque")({
  component: () => (
    <Protected>
      <EstoquePage />
    </Protected>
  ),
});

function EstoquePage() {
  const { data, removeStockItem, removeStockItemFull } = useStore();
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const items = data.stock.filter((i) => i.quantity > 0);
  const totalValue = items.reduce((s, i) => s + i.quantity * i.suggestedPrice, 0);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}" do estoque?\n\nIsso também removerá:\n• O registro do histórico de produção\n• As vendas desse item\n• Restaura os filamentos ao estoque\n\nEssa ação não pode ser desfeita.`)) return;
    try {
      await removeStockItemFull(id);
      toast.success("Item e dados vinculados removidos com sucesso");
    } catch (err: any) {
      toast.error("Erro ao remover: " + err.message);
    }
  };

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
                <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Estoque vazio. Finalize peças na aba Produção.
                </td></tr>
              )}
              {items.map((i) => {
                const margin = i.suggestedPrice - i.productionCost;
                const marginPct = i.productionCost > 0 ? (margin / i.productionCost) * 100 : 0;
                return (
                  <tr key={i.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3 font-medium">{i.name}</td>
                    <td className="p-3 text-center"><span className="inline-flex h-7 min-w-7 px-2 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">{i.quantity}</span></td>
                    <td className="p-3 text-center text-muted-foreground">{i.filamentGrams || 0}g</td>
                    <td className="p-3 text-center text-muted-foreground">{i.estimatedHours || 0}h</td>
                    <td className="p-3 text-right">{formatBRL(i.productionCost)}</td>
                    <td className="p-3 text-right font-semibold">{formatBRL(i.suggestedPrice)}</td>
                    <td className="p-3 text-right text-success">{formatBRL(margin)} <span className="text-xs text-muted-foreground">({marginPct.toFixed(0)}%)</span></td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditItem(i)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Editar item do estoque"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(i.id, i.name)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Excluir item do estoque (filamentos devolvidos)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editItem && (
        <EditStockDialog item={editItem} onClose={() => setEditItem(null)} />
      )}
    </>
  );
}

function EditStockDialog({ item, onClose }: { item: StockItem; onClose: () => void }) {
  const { updateStockItem } = useStore();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [productionCost, setProductionCost] = useState(String(item.productionCost));
  const [suggestedPrice, setSuggestedPrice] = useState(String(item.suggestedPrice));
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateStockItem(item.id, {
        name: name.trim(),
        quantity: parseInt(quantity) || 0,
        productionCost: parseFloat(productionCost) || 0,
        suggestedPrice: parseFloat(suggestedPrice) || 0,
      });
      toast.success("Item atualizado com sucesso");
      onClose();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card rounded-2xl p-6 space-y-4 border border-border"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Editar item do estoque</h3>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-muted-foreground hover:text-foreground">×</button>
        </div>

        <div>
          <label className="text-sm font-medium">Nome da peça</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">Quantidade</label>
            <input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Custo (R$)</label>
            <input
              type="number"
              step="0.01"
              value={productionCost}
              onChange={(e) => setProductionCost(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Preço (R$)</label>
            <input
              type="number"
              step="0.01"
              value={suggestedPrice}
              onChange={(e) => setSuggestedPrice(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background"
            />
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
          Peso do filamento: <strong>{item.filamentGrams}g</strong> · Tempo: <strong>{item.estimatedHours}h</strong>
          <br /><span className="text-muted-foreground/70">Esses valores são definidos na produção e não podem ser alterados aqui.</span>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-input text-sm">Cancelar</button>
          <button type="submit" disabled={saving} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}