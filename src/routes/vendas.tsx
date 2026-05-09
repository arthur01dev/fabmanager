import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/layout/Protected";
import { PageHeader } from "@/components/layout/AppLayout";
import { useStore, formatBRL } from "@/lib/store";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
                <th className="p-3 font-medium">Cliente</th>
                <th className="p-3 font-medium text-center">Qtd</th>
                <th className="p-3 font-medium text-right">Unit.</th>
                <th className="p-3 font-medium text-right">Total</th>
                <th className="p-3 font-medium">Pagamento</th>
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
                  <td className="p-3 text-muted-foreground">{s.client || "—"}</td>
                  <td className="p-3 text-center">{s.quantity}</td>
                  <td className="p-3 text-right">{formatBRL(s.unitPrice)}</td>
                  <td className="p-3 text-right font-semibold text-success">{formatBRL(s.total)}</td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-muted font-medium">{s.paymentMethod || "—"}</span>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => { removeSale(s.id); toast.success("Venda removida"); }} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
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

  const onSelectStock = (id: string) => {
    setStockItemId(id);
    const it = data.stock.find((s) => s.id === id);
    if (it) {
      setProductName(it.name);
      setUnitPrice(String(it.suggestedPrice));
    }
  };

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

  const availableStock = data.stock.filter((s) => s.quantity > 0);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-2xl p-6 space-y-4 border border-border">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Nova venda</h3>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-muted-foreground hover:text-foreground">×</button>
        </div>
        <div>
          <label className="text-sm font-medium">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
        </div>
        <div>
          <label className="text-sm font-medium">Peça do estoque</label>
          <select value={stockItemId} onChange={(e) => onSelectStock(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background">
            <option value="">— Avulso (não está no estoque) —</option>
            {availableStock.map((s) => (
              <option key={s.id} value={s.id}>{s.name} (estoque: {s.quantity})</option>
            ))}
          </select>
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
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-input text-sm">Cancelar</button>
          <button type="submit" className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Registrar</button>
        </div>
      </form>
    </div>
  );
}