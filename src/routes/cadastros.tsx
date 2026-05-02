import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/layout/Protected";
import { PageHeader } from "@/components/layout/AppLayout";
import { useStore, formatBRL } from "@/lib/store";
import { useMemo, useState } from "react";
import { Plus, Trash2, Users, Truck, Boxes, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastros")({
  component: () => (
    <Protected>
      <CadastrosPage />
    </Protected>
  ),
});

type Tab = "clientes" | "fornecedores" | "filamentos";

function CadastrosPage() {
  const [tab, setTab] = useState<Tab>("clientes");

  return (
    <>
      <PageHeader
        title="Cadastros"
        subtitle="Gerencie clientes, fornecedores e estoque de filamentos."
      />

      <div className="flex gap-2 mb-6 bg-card border border-border rounded-xl p-1 w-fit">
        <TabBtn active={tab === "clientes"} onClick={() => setTab("clientes")} icon={<Users className="h-4 w-4" />} label="Clientes" />
        <TabBtn active={tab === "fornecedores"} onClick={() => setTab("fornecedores")} icon={<Truck className="h-4 w-4" />} label="Fornecedores" />
        <TabBtn active={tab === "filamentos"} onClick={() => setTab("filamentos")} icon={<Boxes className="h-4 w-4" />} label="Filamentos" />
      </div>

      {tab === "clientes" && <ClientesTab />}
      {tab === "fornecedores" && <FornecedoresTab />}
      {tab === "filamentos" && <FilamentosTab />}
    </>
  );
}

function TabBtn({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 h-9 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
        active ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon} {label}
    </button>
  );
}

/* ---------- CLIENTES ---------- */
function ClientesTab() {
  const { data, addCustomer, removeCustomer } = useStore();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const stats = useMemo(() => {
    const map = new Map<string, { count: number; total: number; products: string[] }>();
    for (const s of data.sales) {
      if (!s.customerId) continue;
      const cur = map.get(s.customerId) || { count: 0, total: 0, products: [] };
      cur.count += 1;
      cur.total += s.total;
      cur.products.push(s.productName);
      map.set(s.customerId, cur);
    }
    return map;
  }, [data.sales]);

  const sel = data.customers.find((c) => c.id === selected);
  const selStats = sel ? stats.get(sel.id) : null;
  const selSales = sel ? data.sales.filter((s) => s.customerId === sel.id) : [];

  return (
    <>
      <div className="flex justify-end mb-3">
        <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-[var(--shadow-elegant)]">
          <Plus className="h-4 w-4" /> Novo cliente
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="p-3 font-medium">Nome</th>
                <th className="p-3 font-medium">Contato</th>
                <th className="p-3 font-medium text-center">Compras</th>
                <th className="p-3 font-medium text-right">Total gasto</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.customers.length === 0 && (
                <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Nenhum cliente cadastrado.</td></tr>
              )}
              {data.customers.map((c) => {
                const st = stats.get(c.id);
                return (
                  <tr key={c.id} onClick={() => setSelected(c.id)} className={`border-t border-border cursor-pointer hover:bg-muted/30 ${selected === c.id ? "bg-primary/5" : ""}`}>
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.contact || c.email || "—"}</td>
                    <td className="p-3 text-center">{st?.count || 0}</td>
                    <td className="p-3 text-right font-semibold text-success">{formatBRL(st?.total || 0)}</td>
                    <td className="p-3 text-right">
                      <button onClick={(e) => { e.stopPropagation(); if (confirm("Excluir cliente?")) { removeCustomer(c.id); toast.success("Cliente removido"); } }} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <h4 className="font-semibold mb-3">Histórico</h4>
          {!sel && <p className="text-sm text-muted-foreground">Selecione um cliente para ver o histórico.</p>}
          {sel && (
            <div className="space-y-3">
              <div>
                <div className="font-semibold">{sel.name}</div>
                <div className="text-xs text-muted-foreground">{sel.contact || sel.email}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/40 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Compras</div>
                  <div className="font-bold text-lg">{selStats?.count || 0}</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="font-bold text-lg text-success">{formatBRL(selStats?.total || 0)}</div>
                </div>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {selSales.length === 0 && <p className="text-xs text-muted-foreground">Sem compras registradas.</p>}
                {selSales.map((s) => (
                  <div key={s.id} className="text-sm border border-border rounded-lg p-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{s.productName}</span>
                      <span className="text-success font-semibold">{formatBRL(s.total)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString("pt-BR")} · {s.quantity}x</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {open && (
        <SimpleDialog
          title="Novo cliente"
          fields={[
            { key: "name", label: "Nome", required: true },
            { key: "contact", label: "Telefone / WhatsApp" },
            { key: "email", label: "Email" },
            { key: "notes", label: "Observações", textarea: true },
          ]}
          onClose={() => setOpen(false)}
          onSave={(v: any) => { addCustomer(v); toast.success("Cliente cadastrado"); setOpen(false); }}
        />
      )}
    </>
  );
}

/* ---------- FORNECEDORES ---------- */
function FornecedoresTab() {
  const { data, addSupplier, removeSupplier } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex justify-end mb-3">
        <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-[var(--shadow-elegant)]">
          <Plus className="h-4 w-4" /> Novo fornecedor
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="p-3 font-medium">Nome</th>
              <th className="p-3 font-medium">Contato</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Observações</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.suppliers.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Nenhum fornecedor cadastrado.</td></tr>
            )}
            {data.suppliers.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3 text-muted-foreground">{s.contact || "—"}</td>
                <td className="p-3 text-muted-foreground">{s.email || "—"}</td>
                <td className="p-3 text-muted-foreground text-xs">{s.notes || "—"}</td>
                <td className="p-3 text-right">
                  <button onClick={() => { if (confirm("Excluir?")) { removeSupplier(s.id); toast.success("Removido"); } }} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <SimpleDialog
          title="Novo fornecedor"
          fields={[
            { key: "name", label: "Nome", required: true },
            { key: "contact", label: "Telefone" },
            { key: "email", label: "Email" },
            { key: "notes", label: "Observações", textarea: true },
          ]}
          onClose={() => setOpen(false)}
          onSave={(v: any) => { addSupplier(v); toast.success("Fornecedor cadastrado"); setOpen(false); }}
        />
      )}
    </>
  );
}

/* ---------- FILAMENTOS ---------- */
function FilamentosTab() {
  const { data, addFilament, updateFilament, removeFilament } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [addGramsId, setAddGramsId] = useState<string | null>(null);
  const [addGramsValue, setAddGramsValue] = useState("");

  const totalGrams = data.filaments.reduce((s, f) => s + f.grams, 0);
  const totalValue = data.filaments.reduce((s, f) => s + f.grams * (f.pricePerGram ?? data.settings.filamentPricePerGram), 0);

  return (
    <>
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="text-sm text-muted-foreground">Tipos diferentes</div>
          <div className="text-2xl font-bold mt-1">{data.filaments.length}</div>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="text-sm text-muted-foreground">Total em estoque</div>
          <div className="text-2xl font-bold mt-1">{totalGrams.toLocaleString("pt-BR")}g</div>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="text-sm text-muted-foreground">Valor estimado</div>
          <div className="text-2xl font-bold mt-1 text-success">{formatBRL(totalValue)}</div>
        </div>
      </div>

      <div className="flex justify-end mb-3">
        <button onClick={() => { setEditing(null); setOpen(true); }} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-[var(--shadow-elegant)]">
          <Plus className="h-4 w-4" /> Novo filamento
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="p-3 font-medium">Nome</th>
              <th className="p-3 font-medium">Tipo</th>
              <th className="p-3 font-medium">Cor</th>
              <th className="p-3 font-medium text-right">Estoque (g)</th>
              <th className="p-3 font-medium text-right">R$ / g</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.filaments.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Nenhum filamento cadastrado.</td></tr>
            )}
            {data.filaments.map((f) => (
              <tr key={f.id} className="border-t border-border">
                <td className="p-3 font-medium">{f.name}</td>
                <td className="p-3 text-muted-foreground">{f.type || "—"}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-2">
                    {f.color && <span className="h-4 w-4 rounded-full border border-border" style={{ background: f.color }} />}
                    <span className="text-muted-foreground">{f.color || "—"}</span>
                  </span>
                </td>
                <td className="p-3 text-right">
                  <span className={`font-semibold ${f.grams < 100 ? "text-destructive" : ""}`}>{f.grams.toLocaleString("pt-BR")}g</span>
                </td>
                <td className="p-3 text-right text-muted-foreground">{f.pricePerGram ? formatBRL(f.pricePerGram) : <span className="text-xs italic">global</span>}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {addGramsId === f.id ? (
                      <form onSubmit={(e) => { e.preventDefault(); const v = parseFloat(addGramsValue) || 0; if (v > 0) { updateFilament(f.id, { grams: f.grams + v }); toast.success(`+${v}g`); } setAddGramsId(null); setAddGramsValue(""); }} className="flex gap-1">
                        <input autoFocus type="number" step="1" placeholder="g" value={addGramsValue} onChange={(e) => setAddGramsValue(e.target.value)} className="h-7 w-20 px-2 rounded border border-input bg-background text-sm" />
                        <button type="submit" className="h-7 px-2 rounded bg-success text-success-foreground text-xs">+</button>
                        <button type="button" onClick={() => { setAddGramsId(null); setAddGramsValue(""); }} className="h-7 px-2 rounded border border-input text-xs">×</button>
                      </form>
                    ) : (
                      <button onClick={() => setAddGramsId(f.id)} className="text-xs px-2 h-7 rounded border border-input text-muted-foreground hover:text-foreground" title="Repor estoque">+ Repor</button>
                    )}
                    <button onClick={() => { setEditing(f.id); setOpen(true); }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => { if (confirm("Excluir?")) removeFilament(f.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <FilamentDialog
          initial={editing ? data.filaments.find((f) => f.id === editing) : undefined}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSave={(v: any) => {
            if (editing) { updateFilament(editing, v); toast.success("Atualizado"); }
            else { addFilament(v); toast.success("Filamento cadastrado"); }
            setOpen(false); setEditing(null);
          }}
        />
      )}
    </>
  );
}

function FilamentDialog({ initial, onClose, onSave }: any) {
  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState(initial?.type || "PLA");
  const [color, setColor] = useState(initial?.color || "#000000");
  const [grams, setGrams] = useState(String(initial?.grams ?? ""));
  const [price, setPrice] = useState(initial?.pricePerGram ? String(initial.pricePerGram) : "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSave({
      name,
      type,
      color,
      grams: parseFloat(grams) || 0,
      pricePerGram: price ? parseFloat(price) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-2xl p-6 space-y-4 border border-border">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{initial ? "Editar filamento" : "Novo filamento"}</h3>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-muted-foreground hover:text-foreground">×</button>
        </div>
        <div>
          <label className="text-sm font-medium">Nome</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: PLA Preto" className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background">
              <option>PLA</option><option>PETG</option><option>ABS</option><option>TPU</option><option>ASA</option><option>Outro</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Cor</label>
            <div className="mt-1 flex items-center gap-0 border border-input rounded-lg overflow-hidden bg-background focus-within:ring-1 focus-within:ring-ring">
              <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)} 
                className="h-10 w-12 border-0 p-1 bg-transparent cursor-pointer" 
              />
              <div className="w-px h-6 bg-border mx-1" />
              <input 
                value={color} 
                onChange={(e) => setColor(e.target.value)} 
                className="flex-1 h-10 px-2 border-0 bg-transparent text-sm focus:outline-none" 
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Estoque (g)</label>
            <input type="number" step="1" value={grams} onChange={(e) => setGrams(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
          </div>
          <div>
            <label className="text-sm font-medium">R$ / g (opcional)</label>
            <input type="number" step="0.001" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="usar global" className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
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

/* ---------- DIALOG GENÉRICO ---------- */
function SimpleDialog({ title, fields, onClose, onSave }: any) {
  const [values, setValues] = useState<Record<string, string>>({});
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && !values[f.key]) { toast.error(`${f.label} é obrigatório`); return; }
    }
    onSave(values);
  };
  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-2xl p-6 space-y-4 border border-border">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-muted-foreground hover:text-foreground">×</button>
        </div>
        {fields.map((f: any) => (
          <div key={f.key}>
            <label className="text-sm font-medium">{f.label}{f.required && " *"}</label>
            {f.textarea ? (
              <textarea value={values[f.key] || ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background min-h-20" />
            ) : (
              <input value={values[f.key] || ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
            )}
          </div>
        ))}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-input text-sm">Cancelar</button>
          <button type="submit" className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Salvar</button>
        </div>
      </form>
    </div>
  );
}
