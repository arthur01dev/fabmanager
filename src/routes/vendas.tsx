import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/layout/Protected";
import { PageHeader } from "@/components/layout/AppLayout";
import { useStore, formatBRL } from "@/lib/store";
import type { Sale } from "@/lib/types";
import { useMemo, useState, useRef, useEffect } from "react";
import { Plus, Trash2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vendas")({
  component: () => (
    <Protected>
      <VendasPage />
    </Protected>
  ),
});

function VendasPage() {
  const { data, addSale, removeSale } = useStore();
  const [open, setOpen] = useState(false);
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filtered = useMemo(() => {
    return data.sales.filter((s) => {
      const day = s.date.slice(0, 10);
      if (startDate && day < startDate) return false;
      if (endDate && day > endDate) return false;
      return true;
    });
  }, [data.sales, startDate, endDate]);

  const totalFiltered = filtered.reduce((sum, s) => sum + s.total, 0);

  return (
    <>
      <PageHeader
        title="Vendas"
        subtitle="Registre vendas e dê baixa automática no estoque."
        action={
          <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-[var(--shadow-elegant)]">
            <Plus className="h-4 w-4" /> Nova venda
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="flex gap-2 items-center bg-card border border-border rounded-lg p-2">
          <span className="text-xs text-muted-foreground px-1">Período:</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 px-2 rounded-md border border-input bg-background text-sm" />
          <span className="text-muted-foreground text-sm">até</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 px-2 rounded-md border border-input bg-background text-sm" />
          {(startDate || endDate) && (
            <button type="button" onClick={() => { setStartDate(""); setEndDate(""); }} className="text-xs text-muted-foreground hover:text-foreground px-2">
              Limpar
            </button>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {filtered.length} venda(s) · Total: <span className="font-semibold text-success">{formatBRL(totalFiltered)}</span>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="p-3 font-medium">Data</th>
                <th className="p-3 font-medium">Produto</th>
                <th className="p-3 font-medium hidden md:table-cell">Cliente</th>
                <th className="p-3 font-medium text-center">Qtd</th>
                <th className="p-3 font-medium text-right hidden sm:table-cell">Unit.</th>
                <th className="p-3 font-medium text-right">Total</th>
                <th className="p-3 font-medium hidden sm:table-cell">Pagamento</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">
                  {data.sales.length === 0 ? "Nenhuma venda registrada." : "Nenhuma venda no período selecionado."}
                </td></tr>
              )}
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3">{new Date(s.date).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3 font-medium">{s.productName}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{s.client || "—"}</td>
                  <td className="p-3 text-center">{s.quantity}</td>
                  <td className="p-3 text-right hidden sm:table-cell">{formatBRL(s.unitPrice)}</td>
                  <td className="p-3 text-right font-semibold text-success">{formatBRL(s.total)}</td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className="text-xs px-2 py-1 rounded-full bg-muted font-medium">{s.paymentMethod || "—"}</span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditSale(s)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Editar venda"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Excluir esta venda? A quantidade será devolvida ao estoque.')) return;
                          try {
                            await removeSale(s.id);
                            toast.success("Venda removida e estoque restaurado");
                          } catch (err: any) {
                            toast.error("Erro: " + (err as any).message);
                          }
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && <NewSaleDialog onClose={() => setOpen(false)} onSave={async (s) => {
        try {
          await addSale(s);
          toast.success("Venda registrada");
          setOpen(false);
        } catch (err: any) {
          toast.error("Erro ao registrar: " + err.message);
        }
      }} />}

      {editSale && (
        <EditSaleDialog sale={editSale} onClose={() => setEditSale(null)} />
      )}
    </>
  );
}

function NewSaleDialog({ onClose, onSave }: { onClose: () => void; onSave: (s: any) => void }) {
  const { data } = useStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [stockItemId, setStockItemId] = useState<string>("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [client, setClient] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");

  // Estados e ref para o autocomplete de peça do estoque
  const stockRef = useRef<HTMLDivElement>(null);
  const [stockSearch, setStockSearch] = useState("");
  const [showStockSuggestions, setShowStockSuggestions] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (stockRef.current && !stockRef.current.contains(event.target as Node)) {
        setShowStockSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredStock = useMemo(() => {
    const q = stockSearch.toLowerCase().trim();
    const available = data.stock.filter((s) => s.quantity > 0);
    if (!q) return available;
    return available.filter((s) => s.name.toLowerCase().includes(q));
  }, [stockSearch, data.stock]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseInt(quantity);
    const p = parseFloat(unitPrice);
    if (!productName || !q || !p) { toast.error("Preencha os campos"); return; }
    if (stockItemId) {
      const it = data.stock.find((s) => s.id === stockItemId);
      if (it && q > it.quantity) { toast.error("Quantidade maior que o estoque"); return; }
    }
    const customerName = customerId ? data.customers.find((c) => c.id === customerId)?.name : client;
    onSave({
      date,
      stockItemId: stockItemId || undefined,
      customerId: customerId || undefined,
      productName,
      quantity: q,
      unitPrice: p,
      client: customerName || undefined,
      paymentMethod,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-2xl p-6 space-y-4 border border-border shadow-[var(--shadow-elegant)]">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Nova venda</h3>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-muted-foreground hover:text-foreground">×</button>
        </div>
        <div>
          <label className="text-sm font-medium">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
        </div>
        
        {/* Campo Autocomplete de Peça do Estoque */}
        <div ref={stockRef} className="relative">
          <label className="text-sm font-medium text-foreground">Peça do estoque</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={stockSearch}
              onChange={(e) => {
                setStockSearch(e.target.value);
                setShowStockSuggestions(true);
                // Se apagar o texto de busca, limpa a seleção
                if (!e.target.value.trim()) {
                  setStockItemId("");
                  setProductName("");
                  setUnitPrice("");
                }
              }}
              onFocus={() => setShowStockSuggestions(true)}
              placeholder="Pesquisar peça no estoque..."
              className="w-full h-10 pl-9 pr-8 rounded-lg border border-input bg-background text-sm"
              autoComplete="off"
            />
            {stockItemId && (
              <button
                type="button"
                onClick={() => {
                  setStockItemId("");
                  setStockSearch("");
                  setProductName("");
                  setUnitPrice("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm cursor-pointer"
                title="Limpar seleção"
              >
                ×
              </button>
            )}
          </div>
          
          {showStockSuggestions && (
            <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-[var(--shadow-card)] max-h-48 overflow-y-auto">
              <ul className="py-1 text-sm">
                <li
                  onClick={() => {
                    setStockItemId("");
                    setStockSearch("");
                    setProductName("");
                    setUnitPrice("");
                    setShowStockSuggestions(false);
                  }}
                  className="px-3 py-2 cursor-pointer hover:bg-muted text-muted-foreground border-b border-border/50 transition-colors"
                >
                  — Avulso (não está no estoque) —
                </li>
                {filteredStock.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-muted-foreground">
                    Nenhum item encontrado no estoque.
                  </li>
                ) : (
                  filteredStock.map((s) => (
                    <li
                      key={s.id}
                      onClick={() => {
                        setStockItemId(s.id);
                        setStockSearch(s.name);
                        setProductName(s.name);
                        setUnitPrice(String(s.suggestedPrice));
                        setShowStockSuggestions(false);
                      }}
                      className="px-3 py-2 cursor-pointer hover:bg-muted transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                        Qtd: {s.quantity}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {!stockItemId && (
          <div>
            <label className="text-sm font-medium">Nome do produto</label>
            <input value={productName} onChange={(e) => setProductName(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Quantidade</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
          </div>
          <div>
            <label className="text-sm font-medium">Valor unitário</label>
            <input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Cliente (cadastrado)</label>
          <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setClient(""); }} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background">
            <option value="">— Nenhum / avulso —</option>
            {data.customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {!customerId && (
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Ou nome livre (não vinculado)"
              className="mt-2 w-full h-10 px-3 rounded-lg border border-input bg-background"
            />
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Forma de Pagamento</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background">
            <option value="PIX">PIX</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Cartão de Débito">Cartão de Débito</option>
          </select>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{formatBRL((parseFloat(unitPrice) || 0) * (parseInt(quantity) || 0))}</span>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-input text-sm cursor-pointer">Cancelar</button>
          <button type="submit" className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer">Registrar</button>
        </div>
      </form>
    </div>
  );
}

function EditSaleDialog({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { data, updateSale } = useStore();
  const [productName, setProductName] = useState(sale.productName);
  const [client, setClient] = useState(sale.client || "");
  const [customerId, setCustomerId] = useState(sale.customerId || "");
  const [quantity, setQuantity] = useState(String(sale.quantity));
  const [unitPrice, setUnitPrice] = useState(String(sale.unitPrice));
  const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod || "PIX");
  const [date, setDate] = useState(sale.date);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const clientValue = customerId
        ? data.customers.find((c) => c.id === customerId)?.name || client
        : client;
      await updateSale(sale.id, {
        productName: productName.trim(),
        client: clientValue,
        quantity: parseInt(quantity) || sale.quantity,
        unitPrice: parseFloat(unitPrice) || sale.unitPrice,
        paymentMethod,
        date,
      });
      toast.success("Venda atualizada com sucesso");
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
          <h3 className="text-lg font-semibold">Editar venda</h3>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-muted-foreground hover:text-foreground">×</button>
        </div>

        <div>
          <label className="text-sm font-medium">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
        </div>

        <div>
          <label className="text-sm font-medium">Produto</label>
          <input value={productName} onChange={(e) => setProductName(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" required />
        </div>

        <div>
          <label className="text-sm font-medium">Cliente</label>
          <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setClient(""); }} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background">
            <option value="">— Avulso —</option>
            {data.customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {!customerId && (
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Nome livre"
              className="mt-2 w-full h-10 px-3 rounded-lg border border-input bg-background"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Quantidade</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
          </div>
          <div>
            <label className="text-sm font-medium">Valor unitário</label>
            <input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Forma de Pagamento</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background">
            <option value="PIX">PIX</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Cartão de Débito">Cartão de Débito</option>
          </select>
        </div>

        <div className="text-right text-sm text-muted-foreground">
          Novo total: <span className="font-semibold text-foreground">{formatBRL((parseFloat(unitPrice) || 0) * (parseInt(quantity) || 0))}</span>
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