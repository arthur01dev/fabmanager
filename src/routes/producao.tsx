import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/layout/Protected";
import { PageHeader } from "@/components/layout/AppLayout";
import { useStore, formatBRL, formatHoursDecimal } from "@/lib/store";
import type { FilamentUsage } from "@/lib/types";
import { useEffect, useMemo, useState, useRef } from "react";
import { Plus, Trash2, CheckCircle2, Clock, AlertTriangle, History, Search, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/producao")({
  component: () => (
    <Protected>
      <ProducaoPage />
    </Protected>
  ),
});

function ProducaoPage() {
  const { data, addProduction, updateProductionStatus, removeProduction, removeProductionFull } = useStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"ativa" | "historico">("ativa");
  const [editProd, setEditProd] = useState<typeof data.production[0] | null>(null);

  const activeProduction = useMemo(
    () => data.production.filter((p) => p.status === "em_producao"),
    [data.production]
  );

  const history = useMemo(
    () => data.production.filter((p) => p.status === "finalizado"),
    [data.production]
  );

  return (
    <>
      <PageHeader
        title="Produção"
        subtitle="Cadastre peças com múltiplos filamentos. O estoque é atualizado automaticamente ao finalizar."
        action={
          <button
            onClick={() => setOpen(true)}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-[var(--shadow-elegant)]"
          >
            <Plus className="h-4 w-4" /> Nova peça
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-card border border-border rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("ativa")}
          className={`px-4 h-9 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
            tab === "ativa"
              ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4" />
          Em produção
          {activeProduction.length > 0 && (
            <span className="ml-1 h-5 min-w-5 px-1 rounded-full bg-warning/30 text-warning-foreground text-xs font-bold flex items-center justify-center">
              {activeProduction.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("historico")}
          className={`px-4 h-9 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
            tab === "historico"
              ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4" />
          Histórico
          {history.length > 0 && (
            <span className="ml-1 h-5 min-w-5 px-1 rounded-full bg-success/20 text-success text-xs font-bold flex items-center justify-center">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* ABA: EM PRODUÇÃO */}
      {tab === "ativa" && (
        <div className="grid md:grid-cols-2 gap-4">
          {activeProduction.length === 0 && (
            <div className="md:col-span-2 bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
              Nenhuma peça em produção. Clique em "Nova peça" para começar.
            </div>
          )}
          {activeProduction.map((p) => (
            <div key={p.id} className="bg-card rounded-2xl p-5 border border-border shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold flex items-center gap-1.5 flex-wrap">
                    <span>{p.name}</span>
                    {(p.quantity || 1) > 1 && (
                      <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        x{p.quantity}
                      </span>
                    )}
                  </h4>
                  {p.client && <p className="text-sm text-muted-foreground">Cliente: {p.client}</p>}
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-warning/20 text-warning-foreground">
                  Em produção
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mt-4">
                <div>
                  <div className="text-muted-foreground text-xs">Início</div>
                  <div>{new Date(p.startDate + "T12:00:00").toLocaleDateString("pt-BR")}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Tempo de impressão</div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatHoursDecimal(p.estimatedHours)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Filamento total</div>
                  <div>{p.filamentGrams || 0}g</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Custo</div>
                  <div>{formatBRL(p.productionCost)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs">Preço sugerido</div>
                  <div className="text-success font-semibold">{formatBRL(p.suggestedPrice)}</div>
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
                <button
                  onClick={async () => {
                    try {
                      await updateProductionStatus(p.id, "finalizado");
                      toast.success("Peça finalizada e enviada ao estoque");
                    } catch (err: any) {
                      toast.error("Erro ao finalizar: " + err.message);
                    }
                  }}
                  className="flex-1 h-9 rounded-lg bg-success text-success-foreground text-sm font-medium flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="h-4 w-4" /> Finalizar
                </button>
                <button
                  onClick={() => setEditProd(p)}
                  className="h-9 px-3 rounded-lg border border-input text-muted-foreground hover:text-primary"
                  title="Editar peça"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    if (confirm("Excluir esta peça em produção? Filamentos utilizados serão devolvidos ao estoque.")) {
                      try {
                        await removeProduction(p.id);
                        toast.success("Peça removida");
                      } catch (err: any) {
                        toast.error("Erro: " + err.message);
                      }
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
      )}

      {/* ABA: HISTÓRICO */}
      {tab === "historico" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="p-3 font-medium">Peça</th>
                  <th className="p-3 font-medium hidden md:table-cell">Cliente</th>
                  <th className="p-3 font-medium hidden lg:table-cell">Filamentos</th>
                  <th className="p-3 font-medium text-right hidden sm:table-cell">Tempo</th>
                  <th className="p-3 font-medium text-right hidden sm:table-cell">Custo</th>
                  <th className="p-3 font-medium text-right">Preço</th>
                  <th className="p-3 font-medium text-right">Data</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-muted-foreground">
                      Nenhuma peça finalizada ainda. Finalize peças na aba "Em produção".
                    </td>
                  </tr>
                )}
                {history.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3 font-medium flex items-center gap-1.5 flex-wrap">
                      <span>{p.name}</span>
                      {(p.quantity || 1) > 1 && (
                        <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          x{p.quantity}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">{p.client || "—"}</td>
                    <td className="p-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {p.filaments && p.filaments.length > 0 ? (
                          p.filaments.map((f, i) => (
                            <span key={i} className="text-xs bg-muted/60 rounded-full px-2 py-0.5 text-muted-foreground">
                              {f.name} · {f.grams}g
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground">{p.filamentGrams || 0}g</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right text-muted-foreground hidden sm:table-cell">{formatHoursDecimal(p.estimatedHours)}</td>
                    <td className="p-3 text-right hidden sm:table-cell">{formatBRL(p.productionCost)}</td>
                    <td className="p-3 text-right font-semibold text-success">{formatBRL(p.suggestedPrice)}</td>
                    <td className="p-3 text-right text-muted-foreground">
                      {p.startDate
                        ? new Date(p.startDate + "T12:00:00").toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={async () => {
                          if (confirm(`Excluir "${p.name}" do histórico permanentemente?\n\nIsso também removerá:\n• O item do estoque (se ainda existir)\n• As vendas desse item\n• Restaura os filamentos ao estoque\n\nEssa ação não pode ser desfeita.`)) {
                            try {
                              await removeProductionFull(p.id);
                              toast.success("Registro e dados vinculados removidos");
                            } catch (err: any) {
                              toast.error("Erro: " + err.message);
                            }
                          }
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Remover do histórico"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history.length > 0 && (
            <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{history.reduce((s, p) => s + (p.quantity || 1), 0)} peça(s) no histórico</span>
              <div className="flex gap-4">
                <span>
                  Total filamento:{" "}
                  <strong>{history.reduce((s, p) => s + (p.filamentGrams || 0), 0).toFixed(0)}g</strong>
                </span>
                <span>
                  Custo total:{" "}
                  <strong className="text-foreground">
                    {formatBRL(history.reduce((s, p) => s + p.productionCost, 0))}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {open && (
        <NewProductionDialog
          onClose={() => setOpen(false)}
          onSave={async (p) => {
            try {
              await addProduction(p);
              toast.success("Peça adicionada à produção");
              setOpen(false);
            } catch (err: any) {
              toast.error("Erro ao salvar: " + err.message);
            }
          }}
        />
      )}

      {editProd && (
        <EditProductionDialog prod={editProd} onClose={() => setEditProd(null)} />
      )}
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
  const [quantity, setQuantity] = useState(1);
  const [filaments, setFilaments] = useState<FilamentUsage[]>([{ name: "", grams: 0 }]);
  const [productionCost, setProductionCost] = useState("");
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [autoCalc, setAutoCalc] = useState(true);
  const [nameError, setNameError] = useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(event.target as Node)) {
        setShowClientSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredClients = useMemo(() => {
    const q = client.toLowerCase().trim();
    if (!q) return data.customers;
    return data.customers.filter(c => c.name.toLowerCase().includes(q));
  }, [client, data.customers]);

  const hours = parseFloat(estimatedHours.replace(",", ".")) || 0;
  const totalGrams = filaments.reduce((s, f) => s + (f.grams || 0), 0);

  const filamentCost = useMemo(() => {
    return filaments.reduce((sum, f) => {
      if (!f.grams) return sum;
      const stock = f.filamentId ? data.filaments.find((x) => x.id === f.filamentId) : null;
      const price = stock?.pricePerGram ?? filamentPricePerGram;
      // Multiplica pela quantidade para obter o consumo total do lote
      return sum + f.grams * price * quantity;
    }, 0);
  }, [filaments, data.filaments, filamentPricePerGram, quantity]);

  const calcCost = hours * hourlyRate + filamentCost + extraCost;
  const calcPrice = calcCost * (1 + marginPct / 100);

  useEffect(() => {
    if (autoCalc) {
      setProductionCost(calcCost.toFixed(2));
      setSuggestedPrice(calcPrice.toFixed(2));
    }
  }, [estimatedHours, filaments, autoCalc, quantity, calcCost, calcPrice]);

  const addFilamentRow = () => setFilaments([...filaments, { name: "", grams: 0 }]);
  const removeFilamentRow = (i: number) => setFilaments(filaments.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<FilamentUsage>) =>
    setFilaments(filaments.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const stockWarnings = filaments
    .map((f, i) => {
      if (!f.filamentId) return null;
      const stock = data.filaments.find((x) => x.id === f.filamentId);
      if (!stock) return null;
      const needed = f.grams * quantity;
      if (needed > stock.grams) return { i, name: stock.name, have: stock.grams, need: needed };
      return null;
    })
    .filter(Boolean) as { i: number; name: string; have: number; need: number }[];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(true);
      toast.error("Nome da peça é obrigatório");
      return;
    }
    if (quantity < 1) {
      toast.error("Quantidade deve ser de pelo menos 1 unidade");
      return;
    }
    setNameError(false);
    const validFils = filaments.filter((f) => f.name && f.grams > 0);
    if (stockWarnings.length > 0) {
      if (!confirm("Há filamentos com estoque insuficiente. Continuar mesmo assim?")) return;
    }
    onSave({
      name: name.trim(),
      client: client.trim() || undefined,
      status: "em_producao",
      startDate,
      estimatedHours: hours,
      filaments: validFils,
      filamentGrams: totalGrams * quantity,
      productionCost: parseFloat(productionCost) || 0,
      suggestedPrice: parseFloat(suggestedPrice) || 0,
      quantity,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-card rounded-2xl p-4 sm:p-6 space-y-4 border border-border my-auto max-h-[92vh] flex flex-col shadow-[var(--shadow-elegant)]"
      >
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-lg font-semibold text-foreground">Nova peça em produção</h3>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-muted-foreground hover:text-foreground cursor-pointer">×</button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[75vh]">
          <div>
            <label className="text-sm font-medium text-foreground">Nome da peça *</label>
            <input
              required
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(false); }}
              className={`mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm ${nameError ? "border-destructive ring-1 ring-destructive" : "border-input"}`}
              placeholder="Ex: Suporte de parede"
            />
            {nameError && <p className="text-xs text-destructive mt-1">Campo obrigatório</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div ref={clientRef} className="relative">
              <label className="text-sm font-medium text-foreground">Cliente <span className="text-xs text-muted-foreground">(opcional)</span></label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={client}
                  onChange={(e) => {
                    setClient(e.target.value);
                    setShowClientSuggestions(true);
                  }}
                  onFocus={() => setShowClientSuggestions(true)}
                  placeholder="Pesquisar ou digitar avulso"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm"
                  autoComplete="off"
                />
              </div>
              
              {showClientSuggestions && (client.trim() || data.customers.length > 0) && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-[var(--shadow-card)] max-h-48 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground flex items-center justify-between">
                      <span>Nenhum cadastro encontrado.</span>
                      <span className="text-xs bg-muted px-2 py-1 rounded">Será salvo como avulso</span>
                    </div>
                  ) : (
                    <ul className="py-1 text-sm">
                      {filteredClients.map((c) => (
                        <li
                          key={c.id}
                          onClick={() => {
                            setClient(c.name);
                            setShowClientSuggestions(false);
                          }}
                          className="px-3 py-2 cursor-pointer hover:bg-muted transition-colors flex items-center gap-2"
                        >
                          <span className="font-medium text-foreground">{c.name}</span>
                          {c.contact && <span className="text-xs text-muted-foreground ml-auto">{c.contact}</span>}
                        </li>
                      ))}
                      {client.trim() && !data.customers.some(c => c.name.toLowerCase() === client.toLowerCase().trim()) && (
                        <li 
                          onClick={() => setShowClientSuggestions(false)}
                          className="px-3 py-2 border-t border-border cursor-pointer hover:bg-muted transition-colors flex items-center"
                        >
                          <span className="text-muted-foreground">Usar avulso: <strong className="text-foreground">{client}</strong></span>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Tempo (horas decimais)</label>
              <input
                type="text"
                inputMode="decimal"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="Ex: 2.4"
                className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Quantidade (peças)</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-semibold text-primary"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-foreground">Filamentos (por unidade)</label>
              <button type="button" onClick={addFilamentRow} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline cursor-pointer">
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {filaments.map((f, i) => {
                const warn = stockWarnings.find((w) => w.i === i);
                return (
                  <div key={i} className="space-y-1 bg-muted/20 p-2 rounded-lg border border-border/40">
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
                        className="flex-1 h-10 px-2 rounded-lg border border-input bg-background text-xs sm:text-sm"
                      >
                        <option value="">— Selecione do estoque —</option>
                        {data.filaments.map((fs) => (
                          <option key={fs.id} value={fs.id}>{fs.name} ({fs.grams}g disp.)</option>
                        ))}
                        <option value="__custom__">+ Avulso (sem estoque)</option>
                      </select>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="g"
                        value={f.grams || ""}
                        onChange={(e) => updateRow(i, { grams: parseFloat(e.target.value) || 0 })}
                        className="w-20 sm:w-24 h-10 px-2 rounded-lg border border-input bg-background text-sm text-center font-semibold"
                      />
                      <button type="button" onClick={() => removeFilamentRow(i)} className="h-10 px-1 sm:px-2 text-muted-foreground hover:text-destructive cursor-pointer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {!f.filamentId && f.grams > 0 && (
                      <input
                        placeholder="Nome do filamento (ex: PLA Preto avulso)"
                        value={f.name}
                        onChange={(e) => updateRow(i, { name: e.target.value })}
                        className="w-full h-9 px-2 rounded-lg border border-input bg-background text-xs sm:text-sm"
                      />
                    )}
                    {warn && (
                      <div className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
                        <AlertTriangle className="h-3 w-3" /> Estoque insuficiente: {warn.name} tem {warn.have}g, lote precisa de {warn.need}g.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-muted-foreground mt-2 text-right flex justify-between px-1">
              <span>Por peça: <strong>{totalGrams.toFixed(1)}g</strong></span>
              <span>Lote total: <strong className="text-foreground">{(totalGrams * quantity).toFixed(1)}g</strong></span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer select-none">
            <input type="checkbox" checked={autoCalc} onChange={(e) => setAutoCalc(e.target.checked)} className="rounded border-input text-primary focus:ring-primary h-4 w-4" />
            <span>Calcular custos automaticamente</span>
          </label>
          
          {autoCalc && (
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-3.5 space-y-1.5 border border-border/40">
              <div className="flex justify-between">
                <span>Tempo de impressão total:</span>
                <span className="font-medium text-foreground">{hours}h × {formatBRL(hourlyRate)}/h = {formatBRL(hours * hourlyRate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Filamentos do lote ({(totalGrams * quantity).toFixed(1)}g):</span>
                <span className="font-medium text-foreground">{formatBRL(filamentCost)}</span>
              </div>
              {extraCost > 0 && (
                <div className="flex justify-between">
                  <span>Outros custos operacionais:</span>
                  <span className="font-medium text-foreground">{formatBRL(extraCost)}</span>
                </div>
              )}
              <div className="font-semibold text-foreground pt-1.5 border-t border-border mt-1.5 flex justify-between text-sm">
                <span>Custo total do lote:</span>
                <span>{formatBRL(calcCost)} <span className="text-[11px] font-normal text-muted-foreground">(unit: {formatBRL(calcCost / quantity)})</span></span>
              </div>
              <div className="font-bold text-success flex justify-between text-sm">
                <span>Preço sugerido do lote:</span>
                <span>{formatBRL(calcPrice)} <span className="text-[11px] font-medium text-muted-foreground">(unit: {formatBRL(calcPrice / quantity)})</span></span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Custo Lote (R$)</label>
              <input type="number" step="0.01" value={productionCost} disabled={autoCalc} onChange={(e) => setProductionCost(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background disabled:opacity-60 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Preço Lote (R$)</label>
              <input type="number" step="0.01" value={suggestedPrice} disabled={autoCalc} onChange={(e) => setSuggestedPrice(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background disabled:opacity-60 text-sm" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-border mt-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-input text-sm text-foreground hover:bg-muted transition cursor-pointer">Cancelar</button>
          <button type="submit" className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/95 shadow-[var(--shadow-elegant)] transition cursor-pointer">Salvar Produção</button>
        </div>
      </form>
    </div>
  );
}

// ── EDITAR PRODUÇÃO ──────────────────────────────────────────────────────────
function EditProductionDialog({ prod, onClose }: { prod: any; onClose: () => void }) {
  const { data, updateProduction } = useStore();
  const [name, setName] = useState(prod.name);
  const [client, setClient] = useState(prod.client || "");
  const [startDate, setStartDate] = useState(prod.startDate);
  const [estimatedHours, setEstimatedHours] = useState(String(prod.estimatedHours));
  const [filamentGrams, setFilamentGrams] = useState(String(prod.filamentGrams));
  const [quantity, setQuantity] = useState(prod.quantity || 1);
  const [productionCost, setProductionCost] = useState(String(prod.productionCost));
  const [suggestedPrice, setSuggestedPrice] = useState(String(prod.suggestedPrice));
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProduction(prod.id, {
        name: name.trim(),
        client: client.trim() || undefined,
        startDate,
        estimatedHours: parseFloat(estimatedHours.replace(",", ".")) || prod.estimatedHours,
        filamentGrams: parseFloat(filamentGrams) || prod.filamentGrams,
        productionCost: parseFloat(productionCost) || prod.productionCost,
        suggestedPrice: parseFloat(suggestedPrice) || prod.suggestedPrice,
        quantity: quantity,
      });
      toast.success("Produção atualizada com sucesso");
      onClose();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card rounded-2xl p-4 sm:p-6 space-y-4 border border-border my-auto max-h-[90vh] overflow-y-auto shadow-[var(--shadow-elegant)]"
      >
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-lg font-semibold text-foreground">Editar produção</h3>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-muted-foreground hover:text-foreground cursor-pointer">×</button>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Nome da peça</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground">Cliente <span className="text-xs text-muted-foreground">(opcional)</span></label>
            <input
              list="edit-clientes-list"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Cadastrado ou avulso"
              className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            />
            <datalist id="edit-clientes-list">
              {data.customers.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Início</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground">Horas</label>
            <input
              type="text"
              inputMode="decimal"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Lote (g)</label>
            <input
              type="number"
              step="0.1"
              value={filamentGrams}
              onChange={(e) => setFilamentGrams(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-sm font-medium text-foreground">Qtd</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-semibold text-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground">Custo Lote (R$)</label>
            <input type="number" step="0.01" value={productionCost} onChange={(e) => setProductionCost(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Preço Lote (R$)</label>
            <input type="number" step="0.01" value={suggestedPrice} onChange={(e) => setSuggestedPrice(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-3.5 border border-border/40">
          A composição de filamentos (quais filamentos e gramas individuais) é definida na criação e não pode ser editada. Para alterar, exclua e recrie a produção.
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-border mt-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-input text-sm text-foreground hover:bg-muted transition cursor-pointer">Cancelar</button>
          <button type="submit" disabled={saving} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/95 shadow-[var(--shadow-elegant)] disabled:opacity-60 transition cursor-pointer">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
