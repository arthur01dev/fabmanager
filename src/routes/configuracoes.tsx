import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Protected } from "@/components/layout/Protected";
import { PageHeader } from "@/components/layout/AppLayout";
import { useStore, formatBRL } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { Save, RotateCcw, ShieldOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes")({
  component: () => (
    <Protected>
      <ConfiguracoesPage />
    </Protected>
  ),
});

function ConfiguracoesPage() {
  const { isAdmin, ready } = useAuth();
  const navigate = useNavigate();

  // Proteção real: redireciona colaboradores mesmo se acessarem a URL manualmente
  useEffect(() => {
    if (ready && !isAdmin) {
      toast.error("Acesso restrito. Apenas administradores podem acessar Configurações.");
      navigate({ to: "/dashboard" });
    }
  }, [ready, isAdmin, navigate]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <ShieldOff className="h-12 w-12 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }
  const { data, updateSettings, resetAll } = useStore();
  const [hourlyRate, setHourlyRate] = useState(String(data.settings.hourlyRate));
  const [filamentPricePerGram, setFilamentPricePerGram] = useState(String(data.settings.filamentPricePerGram));
  const [marginPct, setMarginPct] = useState(String(data.settings.marginPct));
  const [extraCost, setExtraCost] = useState(String(data.settings.extraCost));

  useEffect(() => {
    setHourlyRate(String(data.settings.hourlyRate));
    setFilamentPricePerGram(String(data.settings.filamentPricePerGram));
    setMarginPct(String(data.settings.marginPct));
    setExtraCost(String(data.settings.extraCost));
  }, [data.settings]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      hourlyRate: parseFloat(hourlyRate) || 0,
      filamentPricePerGram: parseFloat(filamentPricePerGram) || 0,
      marginPct: parseFloat(marginPct) || 0,
      extraCost: parseFloat(extraCost) || 0,
    });
    toast.success("Configurações salvas");
  };

  // Exemplo: 100g, 5h
  const exGrams = 100;
  const exHours = 5;
  const exCost =
    exHours * (parseFloat(hourlyRate) || 0) +
    exGrams * (parseFloat(filamentPricePerGram) || 0) +
    (parseFloat(extraCost) || 0);
  const exPrice = exCost * (1 + (parseFloat(marginPct) || 0) / 100);

  return (
    <>
      <PageHeader title="Configurações" subtitle="Valores globais usados nos cálculos automáticos de custo e preço." />

      <form onSubmit={save} className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
          <h3 className="font-semibold">Custos de produção</h3>
          <div>
            <label className="text-sm font-medium">Valor por hora da impressora (R$)</label>
            <input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
            <p className="text-xs text-muted-foreground mt-1">Inclui energia, depreciação e manutenção.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Valor por grama do filamento (R$)</label>
            <input type="number" step="0.001" value={filamentPricePerGram} onChange={(e) => setFilamentPricePerGram(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
            <p className="text-xs text-muted-foreground mt-1">Ex: bobina de 1kg por R$ 120,00 = R$ 0,12 por grama.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Outros custos padrão por peça (R$)</label>
            <input type="number" step="0.01" value={extraCost} onChange={(e) => setExtraCost(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
            <p className="text-xs text-muted-foreground mt-1">Embalagem, acabamento, etc.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Margem de lucro padrão (%)</label>
            <input type="number" step="1" value={marginPct} onChange={(e) => setMarginPct(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
            <p className="text-xs text-muted-foreground mt-1">Aplicada sobre o custo para sugerir o preço de venda.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-[var(--shadow-elegant)]">
              <Save className="h-4 w-4" /> Salvar
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h3 className="font-semibold mb-3">Simulação</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Peça de exemplo: <strong>{exGrams}g</strong> de filamento e <strong>{exHours}h</strong> de impressão.
            </p>
            <div className="space-y-2 text-sm">
              <Row label={`Tempo (${exHours}h × ${formatBRL(parseFloat(hourlyRate) || 0)})`} value={formatBRL(exHours * (parseFloat(hourlyRate) || 0))} />
              <Row label={`Filamento (${exGrams}g × ${formatBRL(parseFloat(filamentPricePerGram) || 0)})`} value={formatBRL(exGrams * (parseFloat(filamentPricePerGram) || 0))} />
              <Row label="Outros custos" value={formatBRL(parseFloat(extraCost) || 0)} />
              <div className="border-t border-border my-2" />
              <Row label="Custo total" value={formatBRL(exCost)} bold />
              <Row label={`Preço sugerido (margem ${marginPct}%)`} value={formatBRL(exPrice)} success />
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-destructive/30">
            <h3 className="font-semibold mb-2">Zona de risco</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Apaga todos os dados (vendas, produção, estoque, financeiro). Não pode ser desfeito.
            </p>
            <button
              type="button"
              onClick={() => {
                if (confirm("Apagar todos os dados?")) {
                  resetAll();
                  toast.success("Todos os dados foram apagados");
                }
              }}
              className="h-10 px-4 rounded-lg border border-destructive text-destructive text-sm font-medium flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Resetar tudo
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

function Row({ label, value, bold, success }: { label: string; value: string; bold?: boolean; success?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${success ? "text-success" : ""}`}>{value}</span>
    </div>
  );
}
