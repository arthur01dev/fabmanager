import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type {
  AppData, Transaction, ProductionItem, Sale, Settings,
  FilamentStock, Customer, Supplier, FilamentUsage,
} from "./types";

interface StoreCtx {
  data: AppData;
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  addProduction: (p: Omit<ProductionItem, "id">) => Promise<void>;
  updateProductionStatus: (id: string, status: ProductionItem["status"]) => Promise<void>;
  updateProduction: (id: string, patch: any) => Promise<void>;
  removeProduction: (id: string) => Promise<void>;
  removeProductionFull: (id: string) => Promise<void>;
  addSale: (s: Omit<Sale, "id" | "total">) => Promise<void>;
  updateSale: (id: string, patch: any) => Promise<void>;
  removeSale: (id: string) => Promise<void>;
  removeStockItem: (id: string) => Promise<void>;
  removeStockItemFull: (id: string) => Promise<void>;
  updateStockItem: (id: string, patch: any) => Promise<void>;
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  addFilament: (f: Omit<FilamentStock, "id">) => Promise<void>;
  updateFilament: (id: string, patch: Partial<FilamentStock>) => Promise<void>;
  removeFilament: (id: string) => Promise<void>;
  addCustomer: (c: Omit<Customer, "id" | "createdAt">) => Promise<void>;
  updateCustomer: (id: string, patch: Partial<Customer>) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;
  addSupplier: (s: Omit<Supplier, "id" | "createdAt">) => Promise<void>;
  updateSupplier: (id: string, patch: Partial<Supplier>) => Promise<void>;
  removeSupplier: (id: string) => Promise<void>;
  resetAll: () => void;
}

const StoreContext = createContext<StoreCtx | null>(null);

const defaultSettings: Settings = {
  hourlyRate: 0.10,
  filamentPricePerGram: 0.12,
  marginPct: 100,
  extraCost: 0,
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>({
    transactions: [],
    production: [],
    stock: [],
    sales: [],
    settings: defaultSettings,
    filaments: [],
    customers: [],
    suppliers: [],
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const syncData = useCallback(async () => {
    const { data: sData } = await supabase.from("settings").select("*").limit(1).single();
    if (sData) setSettingsId(sData.id);

    const [resSuppliers, resCustomers, resFilaments, resProd, resStock, resSales, resTx] =
      await Promise.all([
        supabase.from("suppliers").select("*").order("name", { ascending: true }),
        supabase.from("customers").select("*").order("name", { ascending: true }),
        supabase.from("filaments").select("*").order("name", { ascending: true }),
        supabase.from("production_items").select("*, production_filament_usage(*)").order("start_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("stock_items").select("*").order("created_at", { ascending: false }),
        supabase.from("sales").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      ]);

    const custName = (cid: any) => resCustomers.data?.find((c: any) => c.id === cid)?.name;

    setData({
      settings: sData
        ? {
            hourlyRate: Number(sData.hourly_rate),
            filamentPricePerGram: Number(sData.filament_price_per_gram),
            marginPct: Number(sData.margin_pct),
            extraCost: Number(sData.extra_cost),
          }
        : defaultSettings,
      suppliers: resSuppliers.data?.map((s: any) => ({
        id: s.id, name: s.name,
        contact: s.contact || undefined, email: s.email || undefined,
        notes: s.notes || undefined, createdAt: s.created_at,
      })) || [],
      customers: resCustomers.data?.map((c: any) => ({
        id: c.id, name: c.name,
        contact: c.contact || undefined, email: c.email || undefined,
        notes: c.notes || undefined, createdAt: c.created_at,
      })) || [],
      filaments: resFilaments.data?.map((f: any) => ({
        id: f.id, name: f.name,
        supplierId: f.supplier_id || undefined,
        type: f.type, color: f.color,
        grams: Number(f.grams),
        pricePerGram: f.price_per_gram ? Number(f.price_per_gram) : undefined,
      })) || [],
      production: resProd.data?.map((p: any) => ({
        id: p.id, name: p.name,
        // Prioriza client_name (texto livre) sobre lookup por FK
        client: p.client_name || custName(p.customer_id),
        status: p.status,
        startDate: p.start_date, endDate: p.end_date || undefined,
        estimatedHours: Number(p.estimated_hours),
        filamentGrams: Number(p.filament_grams_total),
        productionCost: Number(p.production_cost),
        suggestedPrice: Number(p.suggested_price),
        quantity: Number(p.quantity || 1),
        filaments: p.production_filament_usage?.map((u: any) => ({
          filamentId: u.filament_id || undefined,
          name: u.filament_name,
          grams: Number(u.grams) / Number(p.quantity || 1),
        })) || [],
      })) || [],
      stock: resStock.data?.map((s: any) => ({
        id: s.id, name: s.name,
        quantity: Number(s.quantity),
        filamentGrams: Number(s.filament_grams),
        estimatedHours: Number(s.estimated_hours),
        productionCost: Number(s.production_cost),
        suggestedPrice: Number(s.suggested_price),
        productionItemId: s.production_item_id || undefined,
      })) || [],
      sales: resSales.data?.map((s: any) => ({
        id: s.id,
        stockItemId: s.stock_item_id || undefined,
        customerId: s.customer_id || undefined,
        productName: s.product_name,
        // Prioriza nome livre (avulso) sobre lookup por FK
        client: s.client_name || custName(s.customer_id),
        quantity: Number(s.quantity),
        unitPrice: Number(s.unit_price),
        total: Number(s.total),
        date: s.date,
        paymentMethod: s.payment_method || undefined,
      })) || [],
      transactions: resTx.data?.map((t: any) => ({
        id: t.id,
        date: t.date,                          // CORRIGIDO: era t.created_at
        type: t.type as "entrada" | "saida",   // CORRIGIDO: era conversão income/expense
        category: t.category,
        description: t.description,
        amount: Number(t.amount),
      })) || [],
    });
  }, []);

  useEffect(() => {
    if (user) {
      syncData();
    } else {
      setData({
        transactions: [],
        production: [],
        stock: [],
        sales: [],
        settings: defaultSettings,
        filaments: [],
        customers: [],
        suppliers: [],
      });
    }
  }, [syncData, user]);

  // ── FINANCEIRO ──────────────────────────────────────────────────
  const addTransaction = useCallback(async (t: Omit<Transaction, "id">) => {
    const { error } = await supabase.from("transactions").insert({ // CORRIGIDO: era 'financial_entries'
      type: t.type,          // CORRIGIDO: mantém 'entrada'/'saida', não converte
      category: t.category,
      description: t.description,
      amount: t.amount,
      date: t.date,          // CORRIGIDO: era created_at
      sale_id: null,
    });
    if (error) throw error;
    await syncData();
  }, [syncData]);

  const removeTransaction = useCallback(async (tid: string) => {
    await supabase.from("transactions").delete().eq("id", tid); // CORRIGIDO: era 'financial_entries'
    await syncData();
  }, [syncData]);

  // ── PRODUÇÃO ─────────────────────────────────────────────────────
  const addProduction = useCallback(async (p: Omit<ProductionItem, "id">) => {
    const newId = crypto.randomUUID();
    const custId = data.customers.find((c) => c.name === p.client)?.id || null;

    const { error } = await supabase.from("production_items").insert({
      id: newId,
      customer_id: custId,
      client_name: p.client || null, // Salva nome livre mesmo sem FK
      name: p.name,
      status: p.status,
      start_date: p.startDate,
      end_date: p.endDate || null,
      estimated_hours: p.estimatedHours,
      filament_grams_total: p.filamentGrams,
      production_cost: p.productionCost,
      suggested_price: p.suggestedPrice,
      quantity: p.quantity,
    });
    if (error) throw error;

    if (p.filaments && p.filaments.length > 0) {
      const usages = p.filaments.map((f) => ({
        id: crypto.randomUUID(),
        production_item_id: newId,
        filament_id: f.filamentId || null,
        filament_name: f.name,
        grams: f.grams * (p.quantity || 1), // Salva gramas totais consumidas no lote
      }));
      await supabase.from("production_filament_usage").insert(usages);
    }
    await syncData();
  }, [data.customers, syncData]);

  const updateProductionStatus = useCallback(async (pid: string, status: ProductionItem["status"]) => {
    if (status === "finalizado") { // CORRIGIDO: era 'completed'
      const { error } = await supabase.rpc("finalize_production", { p_production_id: pid });
      if (error) throw error;
    } else {
      await supabase.from("production_items").update({ status }).eq("id", pid);
    }
    await syncData();
  }, [syncData]);

  const updateProduction = useCallback(async (pid: string, patch: any) => {
    const payload: any = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.client !== undefined) {
      payload.client_name = patch.client || null;
      payload.customer_id = data.customers.find((c) => c.name === patch.client)?.id || null;
    }
    if (patch.startDate !== undefined) payload.start_date = patch.startDate;
    if (patch.estimatedHours !== undefined) payload.estimated_hours = patch.estimatedHours;
    if (patch.filamentGrams !== undefined) payload.filament_grams_total = patch.filamentGrams;
    if (patch.productionCost !== undefined) payload.production_cost = patch.productionCost;
    if (patch.suggestedPrice !== undefined) payload.suggested_price = patch.suggestedPrice;
    if (patch.quantity !== undefined) payload.quantity = patch.quantity;
    
    const { error } = await supabase.from("production_items").update(payload).eq("id", pid);
    if (error) throw error;

    // Sincroniza a tabela production_filament_usage se filamentos ou quantidade mudarem
    if (patch.filaments !== undefined) {
      const q = patch.quantity ?? data.production.find((p) => p.id === pid)?.quantity ?? 1;
      await supabase.from("production_filament_usage").delete().eq("production_item_id", pid);
      if (patch.filaments && patch.filaments.length > 0) {
        const usages = patch.filaments.map((f: any) => ({
          id: crypto.randomUUID(),
          production_item_id: pid,
          filament_id: f.filamentId || null,
          filament_name: f.name,
          grams: f.grams * q, // Salva gramas totais do lote no banco
        }));
        await supabase.from("production_filament_usage").insert(usages);
      }
    } else if (patch.quantity !== undefined) {
      const prod = data.production.find((p) => p.id === pid);
      if (prod && prod.filaments && prod.filaments.length > 0) {
        await supabase.from("production_filament_usage").delete().eq("production_item_id", pid);
        const usages = prod.filaments.map((f: any) => ({
          id: crypto.randomUUID(),
          production_item_id: pid,
          filament_id: f.filamentId || null,
          filament_name: f.name,
          grams: f.grams * patch.quantity, // f.grams do frontend já é unitário
        }));
        await supabase.from("production_filament_usage").insert(usages);
      }
    }

    await syncData();
  }, [data.customers, data.production, syncData]);

  const removeProduction = useCallback(async (pid: string) => {
    const { error } = await supabase.rpc("delete_production", { p_production_id: pid });
    if (error) throw error;
    await syncData();
  }, [syncData]);

  const removeProductionFull = useCallback(async (pid: string) => {
    // Cadeia completa: remove produção + estoque + vendas + transações + restaura filamentos
    const { error } = await supabase.rpc("delete_full_chain", { p_production_id: pid });
    if (error) throw error;
    await syncData();
  }, [syncData]);

  // ── VENDAS ───────────────────────────────────────────────────────
  const addSale = useCallback(async (s: Omit<Sale, "id" | "total">) => {
    const { data: userData } = await supabase.auth.getUser();
    const custId = s.customerId || data.customers.find((c) => c.name === s.client)?.id || null;

    const { error } = await supabase.rpc("register_sale", {
      p_stock_item_id: s.stockItemId || null,
      p_customer_id: custId,
      p_client_name: custId ? null : (s.client || null), // Nome livre só quando não há FK
      p_product_name: s.productName,
      p_quantity: s.quantity,
      p_unit_price: s.unitPrice,
      p_date: s.date,
      p_payment_method: s.paymentMethod || "PIX",
      p_created_by: userData.user?.id || null,
    });
    if (error) throw error;
    await syncData();
  }, [data.customers, syncData]);

  const removeSale = useCallback(async (sid: string) => {
    // Usa RPC segura que restaura estoque e remove transação antes de deletar
    const { error } = await supabase.rpc("delete_sale", { p_sale_id: sid });
    if (error) throw error;
    await syncData();
  }, [syncData]);

  const updateSale = useCallback(async (sid: string, patch: any) => {
    const payload: any = {};
    if (patch.productName !== undefined) payload.product_name = patch.productName;
    if (patch.quantity !== undefined) payload.quantity = patch.quantity;
    if (patch.unitPrice !== undefined) {
      payload.unit_price = patch.unitPrice;
      // Recalcula total com a quantidade atual
      const currentSale = data.sales.find((s) => s.id === sid);
      const qty = patch.quantity ?? currentSale?.quantity ?? 1;
      payload.total = qty * patch.unitPrice;
    }
    if (patch.client !== undefined) {
      const custId = data.customers.find((c) => c.name === patch.client)?.id || null;
      payload.customer_id = custId;
      payload.client_name = custId ? null : (patch.client || null);
    }
    if (patch.paymentMethod !== undefined) payload.payment_method = patch.paymentMethod;
    if (patch.date !== undefined) payload.date = patch.date;
    const { error } = await supabase.from("sales").update(payload).eq("id", sid);
    if (error) throw error;
    await syncData();
  }, [data.sales, data.customers, syncData]);

  const removeStockItem = useCallback(async (itemId: string) => {
    const { error } = await supabase.rpc("delete_stock_item", { p_stock_item_id: itemId });
    if (error) throw error;
    await syncData();
  }, [syncData]);

  const removeStockItemFull = useCallback(async (itemId: string) => {
    // Cadeia completa: remove estoque + produção (histórico) + vendas + restaura filamentos
    const { error } = await supabase.rpc("delete_stock_full", { p_stock_item_id: itemId });
    if (error) throw error;
    await syncData();
  }, [syncData]);

  const updateStockItem = useCallback(async (itemId: string, patch: any) => {
    const payload: any = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.quantity !== undefined) payload.quantity = patch.quantity;
    if (patch.productionCost !== undefined) payload.production_cost = patch.productionCost;
    if (patch.suggestedPrice !== undefined) payload.suggested_price = patch.suggestedPrice;
    const { error } = await supabase.from("stock_items").update(payload).eq("id", itemId);
    if (error) throw error;
    await syncData();
  }, [syncData]);

  // ── CONFIGURAÇÕES ────────────────────────────────────────────────
  const updateSettings = useCallback(async (s: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...s } }));
    if (!settingsId) return;
    const payload: any = {};
    if (s.hourlyRate !== undefined) payload.hourly_rate = s.hourlyRate;
    if (s.filamentPricePerGram !== undefined) payload.filament_price_per_gram = s.filamentPricePerGram;
    if (s.marginPct !== undefined) payload.margin_pct = s.marginPct;
    if (s.extraCost !== undefined) payload.extra_cost = s.extraCost;
    payload.updated_at = new Date().toISOString();
    await supabase.from("settings").update(payload).eq("id", settingsId);
  }, [settingsId]);

  // ── FILAMENTOS ───────────────────────────────────────────────────
  const addFilament = useCallback(async (f: Omit<FilamentStock, "id">) => {
    const { error } = await supabase.from("filaments").insert({
      id: crypto.randomUUID(),
      supplier_id: f.supplierId || null,
      name: f.name, type: f.type, color: f.color,
      grams: f.grams,
      price_per_gram: f.pricePerGram || null,
    });
    if (error) throw error;
    await syncData(); // CORRIGIDO: sem otimismo falso, só sincroniza após confirmar no banco
  }, [syncData]);

  const updateFilament = useCallback(async (fid: string, patch: Partial<FilamentStock>) => {
    const payload: any = {};
    if (patch.supplierId !== undefined) payload.supplier_id = patch.supplierId || null;
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.type !== undefined) payload.type = patch.type;
    if (patch.color !== undefined) payload.color = patch.color;
    if (patch.grams !== undefined) payload.grams = patch.grams;
    if (patch.pricePerGram !== undefined) payload.price_per_gram = patch.pricePerGram || null;
    await supabase.from("filaments").update(payload).eq("id", fid);
    await syncData();
  }, [syncData]);

  const removeFilament = useCallback(async (fid: string) => {
    await supabase.from("filaments").delete().eq("id", fid);
    await syncData();
  }, [syncData]);

  // ── CLIENTES ─────────────────────────────────────────────────────
  const addCustomer = useCallback(async (c: Omit<Customer, "id" | "createdAt">) => {
    const { error } = await supabase.from("customers").insert({
      id: crypto.randomUUID(),
      name: c.name,
      contact: c.contact || null,
      email: c.email || null,
      notes: c.notes || null,
    });
    if (error) throw error;
    await syncData();
  }, [syncData]);

  const updateCustomer = useCallback(async (cid: string, patch: Partial<Customer>) => {
    const payload: any = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.contact !== undefined) payload.contact = patch.contact || null;
    if (patch.email !== undefined) payload.email = patch.email || null;
    if (patch.notes !== undefined) payload.notes = patch.notes || null;
    await supabase.from("customers").update(payload).eq("id", cid);
    await syncData();
  }, [syncData]);

  const removeCustomer = useCallback(async (cid: string) => {
    await supabase.from("customers").delete().eq("id", cid);
    await syncData();
  }, [syncData]);

  // ── FORNECEDORES ─────────────────────────────────────────────────
  const addSupplier = useCallback(async (s: Omit<Supplier, "id" | "createdAt">) => {
    const { error } = await supabase.from("suppliers").insert({
      id: crypto.randomUUID(),
      name: s.name,
      contact: s.contact || null,
      email: s.email || null,
      notes: s.notes || null,
    });
    if (error) throw error;
    await syncData();
  }, [syncData]);

  const updateSupplier = useCallback(async (sid: string, patch: Partial<Supplier>) => {
    const payload: any = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.contact !== undefined) payload.contact = patch.contact || null;
    if (patch.email !== undefined) payload.email = patch.email || null;
    if (patch.notes !== undefined) payload.notes = patch.notes || null;
    await supabase.from("suppliers").update(payload).eq("id", sid);
    await syncData();
  }, [syncData]);

  const removeSupplier = useCallback(async (sid: string) => {
    await supabase.from("suppliers").delete().eq("id", sid);
    await syncData();
  }, [syncData]);

  const resetAll = useCallback(() => {}, []);

  return (
    <StoreContext.Provider
      value={{
        data,
        addTransaction, removeTransaction,
        addProduction, updateProductionStatus, updateProduction, removeProduction, removeProductionFull,
        addSale, updateSale, removeSale,
        removeStockItem, removeStockItemFull, updateStockItem,
        updateSettings,
        addFilament, updateFilament, removeFilament,
        addCustomer, updateCustomer, removeCustomer,
        addSupplier, updateSupplier, removeSupplier,
        resetAll,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function formatHoursDecimal(h: number): string {
  if (!h || h <= 0) return "0h";
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  if (hh === 0) return `${mm}min`;
  if (mm === 0) return `${hh}h`;
  return `${hh}h ${mm}min`;
}

export function parseTimeToHours(input: string): number {
  if (!input) return 0;
  
  let cleaned = input.toLowerCase().trim().replace(",", ".");
  
  // Caso 1: Formato HH:MM (ex: "1:30" ou "0:45")
  if (/^\d+:\d+$/.test(cleaned)) {
    const [hStr, mStr] = cleaned.split(":");
    const h = parseInt(hStr) || 0;
    const m = parseInt(mStr) || 0;
    return h + m / 60;
  }
  
  // Caso 2: Formato com "h" (ex: "1h30", "1h 30min", "1.5h", "2h")
  const hourMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*h\s*(\d+)?/);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]) || 0;
    const minutes = hourMatch[2] ? parseInt(hourMatch[2]) : 0;
    return hours + minutes / 60;
  }
  
  // Caso 3: Apenas minutos com "min" ou "m" (ex: "30min", "45 m", "15m")
  const minMatch = cleaned.match(/(\d+)\s*(?:min|m)/);
  if (minMatch) {
    const minutes = parseInt(minMatch[1]) || 0;
    return minutes / 60;
  }
  
  // Caso 4: Número puro (ex: "2.75", "1,5")
  if (/^\d+(?:\.\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned) || 0;
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export type { FilamentUsage };
