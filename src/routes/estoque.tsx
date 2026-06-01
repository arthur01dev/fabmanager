import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/layout/Protected";
import { PageHeader } from "@/components/layout/AppLayout";
import { useStore, formatBRL, formatHoursDecimal } from "@/lib/store";
import type { StockItem } from "@/lib/types";
import { useState, useMemo } from "react";
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
  const [detailItem, setDetailItem] = useState<StockItem | null>(null);
  const items = data.stock.filter((i) => i.quantity > 0);
  const totalValue = items.reduce((s, i) => s + i.quantity * i.suggestedPrice, 0);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // Evita abrir o modal de detalhes ao clicar em excluir
    if (!confirm(`Excluir "${name}" do estoque?\n\nIsso também removerá:\n• O registro do histórico de produção\n• As vendas desse item\n• Restaura os filamentos ao estoque\n\nEssa ação não pode ser desfeita.`)) return;
    try {
      await removeStockItemFull(id);
      toast.success("Item e dados vinculados removidos com sucesso");
    } catch (err: any) {
      toast.error("Erro ao remover: " + err.message);
    }
  };

  const handleEdit = (e: React.MouseEvent, item: StockItem) => {
    e.stopPropagation(); // Evita abrir o modal de detalhes ao clicar em editar
    setEditItem(item);
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
                <th className="p-3 font-medium text-center hidden sm:table-cell">Filamento</th>
                <th className="p-3 font-medium text-center hidden sm:table-cell">Tempo</th>
                <th className="p-3 font-medium text-right hidden sm:table-cell">Custo</th>
                <th className="p-3 font-medium text-right">Preço sugerido</th>
                <th className="p-3 font-medium text-right hidden md:table-cell">Margem</th>
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
                  <tr 
                    key={i.id} 
                    onClick={() => setDetailItem(i)}
                    className="border-t border-border hover:bg-muted/20 cursor-pointer transition-all"
                  >
                    <td className="p-3 font-medium text-primary hover:underline">{i.name}</td>
                    <td className="p-3 text-center"><span className="inline-flex h-7 min-w-7 px-2 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">{i.quantity}</span></td>
                    <td className="p-3 text-center text-muted-foreground hidden sm:table-cell">{i.filamentGrams || 0}g</td>
                    <td className="p-3 text-center text-muted-foreground hidden sm:table-cell">{formatHoursDecimal(i.estimatedHours)}</td>
                    <td className="p-3 text-right hidden sm:table-cell">{formatBRL(i.productionCost)}</td>
                    <td className="p-3 text-right font-semibold">{formatBRL(i.suggestedPrice)}</td>
                    <td className="p-3 text-right text-success hidden md:table-cell">{formatBRL(margin)} <span className="text-xs text-muted-foreground">({marginPct.toFixed(0)}%)</span></td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => handleEdit(e, i)}
                          className="text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-muted"
                          title="Editar item do estoque"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, i.id, i.name)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded hover:bg-muted"
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

      {detailItem && (
        <DetailStockDialog item={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </>
  );
}

function DetailStockDialog({ item, onClose }: { item: StockItem; onClose: () => void }) {
  const { data } = useStore();
  
  const prod = useMemo(() => {
    if (!item.productionItemId) return null;
    return data.production.find((p) => p.id === item.productionItemId);
  }, [item.productionItemId, data.production]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-card rounded-2xl p-5 sm:p-6 space-y-5 border border-border shadow-[var(--shadow-elegant)] max-h-[92vh] flex flex-col my-auto"
      >
        <div className="flex justify-between items-start border-b border-border pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25">
              Detalhes do Item
            </span>
            <h3 className="text-lg font-bold text-foreground mt-1">{item.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-muted-foreground hover:text-foreground cursor-pointer">×</button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="grid grid-cols-2 gap-3 bg-muted/20 p-4 rounded-xl border border-border/40">
            <div>
              <span className="text-xs text-muted-foreground block">Cliente</span>
              <span className="font-semibold text-foreground text-sm">{prod?.client || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Data de Produção</span>
              <span className="font-semibold text-foreground text-sm">
                {prod?.endDate 
                  ? new Date(prod.endDate).toLocaleDateString("pt-BR") 
                  : prod?.startDate 
                    ? new Date(prod.startDate + "T12:00:00").toLocaleDateString("pt-BR")
                    : "—"}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Estoque Atual</span>
              <span className="font-semibold text-primary text-sm">
                {item.quantity} {item.quantity === 1 ? "unidade" : "unidades"}
                {prod && (
                  <span className="text-[10px] font-normal text-muted-foreground block leading-tight">
                    (lote original: {prod.quantity} un.)
                  </span>
                )}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Tempo de Impressão</span>
              <span className="font-semibold text-foreground text-sm">
                {formatHoursDecimal(item.estimatedHours)} <span className="text-xs font-normal text-muted-foreground">(unit.)</span>
                {prod && prod.quantity > 1 && (
                  <span className="text-[10px] font-normal text-muted-foreground block leading-tight">
                    (lote: {formatHoursDecimal(prod.estimatedHours)})
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/10 border border-border/30 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-muted-foreground block">Custo Unitário</span>
              <span className="font-semibold text-foreground text-xs sm:text-sm">{formatBRL(item.productionCost)}</span>
              {prod && prod.quantity > 1 && (
                <span className="text-[9px] text-muted-foreground block mt-0.5">
                  Lote: {formatBRL(prod.productionCost)}
                </span>
              )}
            </div>
            <div className="bg-muted/10 border border-border/30 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-muted-foreground block">Venda Sugerida</span>
              <span className="font-semibold text-success text-xs sm:text-sm">{formatBRL(item.suggestedPrice)}</span>
              {prod && prod.quantity > 1 && (
                <span className="text-[9px] text-muted-foreground block mt-0.5">
                  Lote: {formatBRL(prod.suggestedPrice)}
                </span>
              )}
            </div>
            <div className="bg-success/5 border border-success/10 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-success block">Margem unitária</span>
              <span className="font-bold text-success text-xs sm:text-sm">{formatBRL(item.suggestedPrice - item.productionCost)}</span>
              <span className="text-[9px] text-muted-foreground block mt-0.5">
                ({item.productionCost > 0 ? (((item.suggestedPrice - item.productionCost) / item.productionCost) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Filamentos Utilizados
            </h4>
            
            {prod && prod.filaments && prod.filaments.length > 0 ? (
              <div className="space-y-2">
                {prod.filaments.map((f, idx) => {
                  const fStock = f.filamentId ? data.filaments.find(x => x.id === f.filamentId) : null;
                  const color = fStock?.color || "Não especificada";
                  const type = fStock?.type || "PLA";
                  
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 border border-border/40 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="h-3 w-3 rounded-full border border-border/60 shadow-sm flex-shrink-0"
                          style={{
                            backgroundColor: fStock?.color || "#94a3b8"
                          }}
                          title={`Cor: ${color}`}
                        />
                        <div>
                          <span className="font-medium text-xs sm:text-sm text-foreground block leading-tight">
                            {f.name || fStock?.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Cor: {color} · Tipo: <span className="font-semibold text-primary">{type}</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-xs sm:text-sm text-foreground block leading-tight">
                          {f.grams.toFixed(1)}g
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {prod.quantity > 1 ? `(lote: ${(f.grams * prod.quantity).toFixed(1)}g)` : "unitário"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-muted/20 border border-border/40 rounded-xl text-center text-xs text-muted-foreground">
                Composição individual de filamentos não registrada (Peso unitário: {item.filamentGrams}g).
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-border mt-2">
          <button 
            type="button" 
            onClick={onClose} 
            className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/95 shadow-[var(--shadow-elegant)] transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
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
        className="w-full max-w-md bg-card rounded-2xl p-6 space-y-4 border border-border shadow-[var(--shadow-elegant)]"
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
          Peso do filamento: <strong>{item.filamentGrams}g</strong> · Tempo: <strong>{formatHoursDecimal(item.estimatedHours)}</strong>
          <br /><span className="text-muted-foreground/70">Esses valores são definidos na produção e não podem ser alterados aqui.</span>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-input text-sm cursor-pointer">Cancelar</button>
          <button type="submit" disabled={saving} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60 cursor-pointer">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}