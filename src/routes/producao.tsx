import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/layout/Protected";
import { PageHeader } from "@/components/layout/AppLayout";
import { useStore, formatBRL, formatHoursDecimal } from "@/lib/store";
import type { FilamentUsage } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/producao")({
  component: () => (
    <Protected>
      <ProducaoPage />
    </Protected>
  ),
});

function ProducaoPage() {
  const { data, addProduction, updateProductionStatus, removeProduction } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Produção"
        subtitle="Cadastre peças com múltiplos filamentos. O estoque de matéria-prima é descontado automaticamente."
        action={
          <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-[var(--shadow-elegant)]">
            <Plus className="h-4 w-4" /> Nova peça
          </button>
        }
      />

      <div className="grid md:grid-cols-2 gap-4">
        {data.production.length === 0 && (
          <div className="md:col-span-2 bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
            Nenhuma peça em produção. Clique em "Nova peça" para começar.
          </div>
        )}
        {data.production.map((p) => (
          <div key={p.id} className="bg-card rounded-2xl p-5 border border-border shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold">{p.name}</h4>
                {p.client && <p className="text-sm text-muted-foreground">Cliente: {p.client}</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.status === "finalizado" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"}`}>
                {p.status === "finalizado" ? "Finalizado" : "Em produção"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mt-4">
              <div>
                <div className="text-muted-foreground text-xs">Início</div>
                <div>{new Date(p.startDate).toLocaleDateString("pt-BR")}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Conclusão</div>
                <div>{p.endDate ? new Date(p.endDate).toLocaleDateString("pt-BR") : "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Tempo de impressão</div>
                <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.estimatedHours}h <span className="text-xs text-muted-foreground">({formatHoursDecimal(p.estimatedHours)})</span></div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Filamento total</div>
                <div>{p.filamentGrams || 0}g</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Custo</div>
                <div>{formatBRL(p.productionCost)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Preço sugerido</div>
                <div className="text-success font-medium">{formatBRL(p.suggestedPrice)}</div>
              </div>
            </div>
            {p.filaments && p.filaments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.filaments.map((f, i) => (
                  <span key={i} className="text-xs bg-muted/60 rounded-full px-2 py-0.5 text-muted-foreground">
                    {f.name} · {f.grams}g
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              {p.status !== "finalizado" && (
                <button onClick={() => { updateProductionStatus(p.id, "finalizado"); toast.success("Peça finalizada e enviada ao estoque"); }} className="flex-1 h-9 rounded-lg bg-success text-success-foreground text-sm font-medium flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Finalizar
                </button>
              )}
              <button 
                onClick={async () => { 
                  if (confirm("Excluir esta peça em produção?")) {
                    await removeProduction(p.id); 
                    toast.success("Peça removida"); 
                  }
                }} 
                className="h-9 px-3 rounded-lg border border-input text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {open && <NewProductionDialog onClose={() => setOpen(false)} onSave={async (p) => { 
        await addProduction(p); 
        toast.success("Peça adicionada · estoque de filamento atualizado"); 
        setOpen(false); 
      }} />}
    </>
  );
}

function NewProductionDialog({ onClose, onSave }: { onClose: () => void; onSave: (p: any) => void }) {
  const { data } = useStore();
  const { hourlyRate, marginPct, extraCost, filamentPricePerGram } = data.settings;
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [estimatedHours, setEstimatedHours] = useState("");
  const [filaments, setFilaments] = useState<FilamentUsage[]>([{ name: "", grams: 0 }]);
  const [productionCost, setProductionCost] = useState("");
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [autoCalc, setAutoCalc] = useState(true);

  // hours como decimal puro (ex: 2.4 = 2h24min)
  const hours = parseFloat(estimatedHours.replace(",", ".")) || 0;

  const totalGrams = filaments.reduce((s, f) => s + (f.grams || 0), 0);

  const filamentCost = useMemo(() => {
    return filaments.reduce((sum, f) => {
      if (!f.grams) return sum;
      const stock = f.filamentId ? data.filaments.find((x) => x.id === f.filamentId) : null;
      const price = stock?.pricePerGram ?? filamentPricePerGram;
      return sum + f.grams * price;
    }, 0);
  }, [filaments, data.filaments, filamentPricePerGram]);

  const calcCost = hours * hourlyRate + filamentCost + extraCost;
  const calcPrice = calcCost * (1 + marginPct / 100);

  useEffect(() => {
    if (autoCalc) {
      setProductionCost(calcCost.toFixed(2));
      setSuggestedPrice(calcPrice.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimatedHours, filaments, autoCalc]);

  const addFilamentRow = () => setFilaments([...filaments, { name: "", grams: 0 }]);
  const removeFilamentRow = (i: number) => setFilaments(filaments.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<FilamentUsage>) =>
    setFilaments(filaments.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  // valida estoque
  const stockWarnings = filaments
    .map((f, i) => {
      if (!f.filamentId) return null;
      const stock = data.filaments.find((x) => x.id === f.filamentId);
      if (!stock) return null;
      if (f.grams > stock.grams) return { i, name: stock.name, have: stock.grams, need: f.grams };
      return null;
    })
    .filter(Boolean) as { i: number; name: string; have: number; need: number }[];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const validFils = filaments.filter((f) => f.name && f.grams > 0);
    if (stockWarnings.length > 0) {
      if (!confirm("Há filamentos com estoque insuficiente. Continuar mesmo assim?")) return;
    }
    onSave({
      name,
      client: client || undefined,
      status: "em_producao",
      startDate,
      estimatedHours: hours,
      filaments: validFils,
      filamentGrams: totalGrams,
      productionCost: parseFloat(productionCost) || 0,
      suggestedPrice: parseFloat(suggestedPrice) || 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-card rounded-2xl p-6 space-y-4 border border-border max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Nova peça em produção</h3>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-muted-foreground hover:text-foreground">×</button>
        </div>
        <div>
          <label className="text-sm font-medium">Nome da peça</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Cliente</label>
            <input list="clientes" value={client} onChange={(e) => setClient(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
            <datalist id="clientes">
              {data.customers.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>
          <div>
            <label className="text-sm font-medium">Início</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Tempo de impressão (horas decimais)</label>
          <input
            type="text"
            inputMode="decimal"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
            placeholder="Ex: 2.4 (do Bambu Studio)"
            className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use o valor exato do Bambu Studio (ex: <strong>2.4</strong> = {formatHoursDecimal(2.4)}). Atual: <strong>{formatHoursDecimal(hours)}</strong>
          </p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium">Filamentos utilizados</label>
            <button type="button" onClick={addFilamentRow} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>
          <div className="space-y-2">
            {filaments.map((f, i) => {
              const warn = stockWarnings.find((w) => w.i === i);
              return (
                <div key={i} className="space-y-1">
                  <div className="flex gap-2 items-start">
                    <select
                      value={f.filamentId || ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (id === "__custom__") {
                          updateRow(i, { filamentId: undefined, name: "" });
                        } else if (id) {
                          const fs = data.filaments.find((x) => x.id === id);
                          updateRow(i, { filamentId: id, name: fs?.name || "" });
                        } else {
                          updateRow(i, { filamentId: undefined });
                        }
                      }}
                      className="flex-1 h-10 px-2 rounded-lg border border-input bg-background text-sm"
                    >
                      <option value="">— Selecione do estoque —</option>
                      {data.filaments.map((fs) => (
                        <option key={fs.id} value={fs.id}>{fs.name} ({fs.grams}g)</option>
                      ))}
                      <option value="__custom__">+ Avulso (sem estoque)</option>
                    </select>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="g"
                      value={f.grams || ""}
                      onChange={(e) => updateRow(i, { grams: parseFloat(e.target.value) || 0 })}
                      className="w-24 h-10 px-2 rounded-lg border border-input bg-background text-sm"
                    />
                    <button type="button" onClick={() => removeFilamentRow(i)} className="h-10 px-2 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {!f.filamentId && f.grams > 0 && (
                    <input
                      placeholder="Nome do filamento (ex: PLA Preto avulso)"
                      value={f.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                      className="w-full h-9 px-2 rounded-lg border border-input bg-background text-sm"
                    />
                  )}
                  {warn && (
                    <div className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Estoque insuficiente: {warn.name} tem {warn.have}g, precisa de {warn.need}g.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground mt-2 text-right">Total: <strong className="text-foreground">{totalGrams.toFixed(1)}g</strong></div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={autoCalc} onChange={(e) => setAutoCalc(e.target.checked)} />
          Calcular custo e preço automaticamente
        </label>
        {autoCalc && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
            <div>Tempo: {hours}h × {formatBRL(hourlyRate)} = <strong className="text-foreground">{formatBRL(hours * hourlyRate)}</strong></div>
            <div>Filamentos ({totalGrams.toFixed(1)}g): <strong className="text-foreground">{formatBRL(filamentCost)}</strong></div>
            {extraCost > 0 && <div>Outros: {formatBRL(extraCost)}</div>}
            <div className="font-semibold text-foreground pt-1 border-t border-border mt-1">Custo total: {formatBRL(calcCost)}</div>
            <div className="font-semibold text-success">Preço sugerido (margem {marginPct}%): {formatBRL(calcPrice)}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Custo (R$)</label>
            <input type="number" step="0.01" value={productionCost} disabled={autoCalc} onChange={(e) => setProductionCost(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background disabled:opacity-60" />
          </div>
          <div>
            <label className="text-sm font-medium">Preço (R$)</label>
            <input type="number" step="0.01" value={suggestedPrice} disabled={autoCalc} onChange={(e) => setSuggestedPrice(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background disabled:opacity-60" />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-input text-sm">Cancelar</button>
          <button type="submit" className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Salvar</button>
        </div>
      </form>
    </div>
  );
}
