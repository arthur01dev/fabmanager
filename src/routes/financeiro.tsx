import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/layout/Protected";
import { PageHeader } from "@/components/layout/AppLayout";
import { useStore, formatBRL } from "@/lib/store";
import { useMemo, useState } from "react";
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/financeiro")({
  component: () => (
    <Protected>
      <FinanceiroPage />
    </Protected>
  ),
});

const CATEGORIES = ["Venda", "Material", "Energia", "Manutenção", "Equipamento", "Marketing", "Outro"];

function FinanceiroPage() {
  const { data, addTransaction, removeTransaction } = useStore();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return data.transactions.filter((t) => {
      if (from && t.date < from) return false;
      if (to && t.date > to + "T23:59:59") return false;
      return true;
    });
  }, [data.transactions, from, to]);

  const totals = useMemo(() => {
    const inc = filtered.filter((t) => t.type === "entrada").reduce((s, t) => s + t.amount, 0);
    const out = filtered.filter((t) => t.type === "saida").reduce((s, t) => s + t.amount, 0);
    return { inc, out, balance: inc - out };
  }, [filtered]);

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="Entradas, saídas e saldo do seu negócio."
        action={
          <button
            onClick={() => setOpen(true)}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-[var(--shadow-elegant)] hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> Novo lançamento
          </button>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="text-sm text-muted-foreground">Entradas</div>
          <div className="text-2xl font-bold text-success mt-1">{formatBRL(totals.inc)}</div>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="text-sm text-muted-foreground">Saídas</div>
          <div className="text-2xl font-bold text-destructive mt-1">{formatBRL(totals.out)}</div>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="text-sm text-muted-foreground">Saldo</div>
          <div className={`text-2xl font-bold mt-1 ${totals.balance >= 0 ? "text-foreground" : "text-destructive"}`}>{formatBRL(totals.balance)}</div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 flex flex-wrap gap-3 items-end border-b border-border">
          <div>
            <label className="text-xs text-muted-foreground">De</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block h-9 px-2 rounded-md border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Até</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block h-9 px-2 rounded-md border border-input bg-background text-sm" />
          </div>
          {(from || to) && (
            <button onClick={() => { setFrom(""); setTo(""); }} className="h-9 px-3 text-sm text-muted-foreground hover:text-foreground">
              Limpar filtros
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-muted-foreground">
                <th className="p-3 font-medium">Data</th>
                <th className="p-3 font-medium">Tipo</th>
                <th className="p-3 font-medium">Categoria</th>
                <th className="p-3 font-medium">Descrição</th>
                <th className="p-3 font-medium text-right">Valor</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum lançamento.</td></tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="p-3">{new Date(t.date).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3">
                    {t.type === "entrada" ? (
                      <span className="inline-flex items-center gap-1 text-success font-medium"><ArrowDownCircle className="h-4 w-4" /> Entrada</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive font-medium"><ArrowUpCircle className="h-4 w-4" /> Saída</span>
                    )}
                  </td>
                  <td className="p-3">{t.category}</td>
                  <td className="p-3 text-muted-foreground">{t.description}</td>
                  <td className={`p-3 text-right font-semibold ${t.type === "entrada" ? "text-success" : "text-destructive"}`}>
                    {t.type === "entrada" ? "+" : "−"} {formatBRL(t.amount)}
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => { removeTransaction(t.id); toast.success("Removido"); }} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && <NewTxDialog onClose={() => setOpen(false)} onSave={async (t) => { 
        const res = await addTransaction(t); 
        if (res?.ok) {
          toast.success("Lançamento adicionado"); 
          setOpen(false); 
        } else {
          toast.error("Erro ao salvar: " + res?.error);
        }
      }} />}
    </>
  );
}

function NewTxDialog({ onClose, onSave }: { onClose: () => void; onSave: (t: any) => void }) {
  const [type, setType] = useState<"entrada" | "saida">("saida");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("Material");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) { toast.error("Valor inválido"); return; }
    onSave({ type, date, category, description, amount: value });
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-2xl p-6 space-y-4 border border-border shadow-[var(--shadow-card)]">
        <h3 className="text-lg font-semibold">Novo lançamento</h3>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setType("entrada")} className={`h-10 rounded-lg border text-sm font-medium ${type === "entrada" ? "border-success bg-success/10 text-success" : "border-input"}`}>Entrada</button>
          <button type="button" onClick={() => setType("saida")} className={`h-10 rounded-lg border text-sm font-medium ${type === "saida" ? "border-destructive bg-destructive/10 text-destructive" : "border-input"}`}>Saída</button>
        </div>

        <div>
          <label className="text-sm font-medium">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
        </div>

        <div>
          <label className="text-sm font-medium">Categoria</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Descrição</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" placeholder="Opcional" />
        </div>

        <div>
          <label className="text-sm font-medium">Valor (R$)</label>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-input text-sm">Cancelar</button>
          <button type="submit" className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Salvar</button>
        </div>
      </form>
    </div>
  );
}