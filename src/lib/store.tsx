import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "./supabase";
import type {
  AppData, Transaction, ProductionItem, Sale, Settings,
  FilamentStock, Customer, Supplier, FilamentUsage,
} from "./types";



const id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

interface StoreCtx {
  data: AppData;
  addTransaction: (t: Omit<Transaction, "id">) => void | Promise<void>;
  removeTransaction: (id: string) => void | Promise<void>;
  addProduction: (p: Omit<ProductionItem, "id">) => void | Promise<void>;
  updateProductionStatus: (id: string, status: ProductionItem["status"]) => void | Promise<void>;
  removeProduction: (id: string) => void | Promise<void>;
  addSale: (s: Omit<Sale, "id" | "total">) => void | Promise<void>;
  removeSale: (id: string) => void | Promise<void>;
  updateSettings: (s: Partial<Settings>) => void | Promise<void>;
  addFilament: (f: Omit<FilamentStock, "id">) => void | Promise<void>;
  updateFilament: (id: string, patch: Partial<FilamentStock>) => void | Promise<void>;
  removeFilament: (id: string) => void | Promise<void>;
  addCustomer: (c: Omit<Customer, "id" | "createdAt">) => void | Promise<void>;
  updateCustomer: (id: string, patch: Partial<Customer>) => void | Promise<void>;
  removeCustomer: (id: string) => void | Promise<void>;
  addSupplier: (s: Omit<Supplier, "id" | "createdAt">) => void | Promise<void>;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void | Promise<void>;
  removeSupplier: (id: string) => void | Promise<void>;
  resetAll: () => void;
}

const StoreContext = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({
    transactions: [],
    production: [],
    stock: [],
    sales: [],
    settings: {
      hourlyRate: 5,
      filamentPricePerGram: 0.12,
      marginPct: 100,
      extraCost: 0,
    },
    filaments: [],
    customers: [],
    suppliers: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const syncData = useCallback(async () => {
    const { data: sData, error } = await supabase.from('settings').select('*').limit(1).single();
    if (!error && sData) setSettingsId(sData.id);

    const [resSuppliers, resCustomers, resFilaments, resProd, resStock, resSales, resTx] = await Promise.all([
      supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('filaments').select('*').order('created_at', { ascending: false }),
      supabase.from('production_items').select('*, production_filament_usage(*)').order('created_at', { ascending: false }),
      supabase.from('stock_items').select('*').order('created_at', { ascending: false }),
      supabase.from('sales').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('date', { ascending: false })
    ]);

    const custName = (id: any) => resCustomers.data?.find((c: any) => c.id === id)?.name;

    setData(d => ({
      settings: sData ? {
        hourlyRate: sData.hourly_rate,
        filamentPricePerGram: sData.filament_price_per_gram,
        marginPct: sData.margin_pct,
        extraCost: sData.extra_cost,
      } : d.settings,
      suppliers: resSuppliers.data?.map(s => ({
        id: s.id,
        name: s.name,
        contact: s.contact || undefined,
        email: s.email || undefined,
        notes: s.notes || undefined,
        createdAt: s.created_at,
      })) || d.suppliers,
      customers: resCustomers.data?.map(c => ({
        id: c.id,
        name: c.name,
        contact: c.contact || undefined,
        email: c.email || undefined,
        notes: c.notes || undefined,
        createdAt: c.created_at,
      })) || d.customers,
      filaments: resFilaments.data?.map(f => ({
        id: f.id,
        supplierId: f.supplier_id || undefined,
        name: f.name,
        type: f.type,
        color: f.color,
        grams: Number(f.grams),
        pricePerGram: f.price_per_gram ? Number(f.price_per_gram) : undefined,
      })) || d.filaments,
      production: resProd.data?.map((p: any) => ({
        id: p.id,
        name: p.name,
        client: custName(p.customer_id),
        status: p.status,
        startDate: p.start_date,
        endDate: p.end_date || undefined,
        estimatedHours: Number(p.estimated_hours),
        filamentGrams: Number(p.filament_grams_total),
        productionCost: Number(p.production_cost),
        suggestedPrice: Number(p.suggested_price),
        filaments: p.production_filament_usage?.map((u: any) => ({
          filamentId: u.filament_id || undefined,
          name: u.filament_name,
          grams: Number(u.grams)
        })) || []
      })) || d.production,
      stock: resStock.data?.map((s: any) => ({
        id: s.id,
        name: s.name,
        quantity: Number(s.quantity),
        filamentGrams: Number(s.filament_grams),
        estimatedHours: Number(s.estimated_hours),
        productionCost: Number(s.production_cost),
        suggestedPrice: Number(s.suggested_price)
      })) || d.stock,
      sales: resSales.data?.map((s: any) => ({
        id: s.id,
        stockItemId: s.stock_item_id || undefined,
        productName: s.product_name,
        client: custName(s.customer_id),
        quantity: Number(s.quantity),
        unitPrice: Number(s.unit_price),
        total: Number(s.total),
        date: s.date
      })) || d.sales,
      transactions: resTx.data?.map((t: any) => ({
        id: t.id,
        date: t.date,
        type: t.type,
        category: t.category,
        description: t.description,
        amount: Number(t.amount)
      })) || d.transactions,
    }));
  }, []);

  useEffect(() => {
    syncData();
  }, [syncData]);

  const addTransaction = useCallback(async (t: Omit<Transaction, "id">) => {
    try {
      const { error } = await supabase.from('transactions').insert({
        id: crypto.randomUUID(),
        type: t.type,
        category: t.category,
        description: t.description,
        amount: t.amount,
        date: t.date,
        sale_id: null // Explicitamente null para evitar erro de FK
      });
      if (error) throw error;
      await syncData();
      return { ok: true };
    } catch (err: any) {
      console.error(err);
      return { ok: false, error: err.message };
    }
  }, [syncData]);

  const removeTransaction = useCallback(async (tid: string) => {
    await supabase.from('transactions').delete().eq('id', tid);
    await syncData();
  }, [syncData]);

  const addProduction = useCallback(async (p: Omit<ProductionItem, "id">) => {
    const newId = crypto.randomUUID();
    const custId = data.customers.find(c => c.name === p.client)?.id || null;

    await supabase.from('production_items').insert({
      id: newId,
      customer_id: custId,
      name: p.name,
      status: p.status,
      start_date: p.startDate,
      end_date: p.endDate || null,
      estimated_hours: p.estimatedHours,
      filament_grams_total: p.filamentGrams,
      production_cost: p.productionCost,
      suggested_price: p.suggestedPrice
    });

    if (p.filaments && p.filaments.length > 0) {
      const usages = p.filaments.map(f => ({
        id: crypto.randomUUID(),
        production_item_id: newId,
        filament_id: f.filamentId || null,
        filament_name: f.name,
        grams: f.grams
      }));
      await supabase.from('production_filament_usage').insert(usages);
    }
    
    if (p.status === 'finalizado') {
      await supabase.rpc('finalize_production', { p_production_id: newId });
    }
    await syncData();
  }, [data.customers, syncData]);

  const updateProductionStatus = useCallback(async (pid: string, status: ProductionItem["status"]) => {
    if (status === 'finalizado') {
       await supabase.rpc('finalize_production', { p_production_id: pid });
    } else {
       await supabase.from('production_items').update({ status }).eq('id', pid);
    }
    await syncData();
  }, [syncData]);

  const removeProduction = useCallback(async (pid: string) => {
    // Primeiro remove os vínculos de filamento para evitar erro de FK
    await supabase.from('production_filament_usage').delete().eq('production_item_id', pid);
    await supabase.from('production_items').delete().eq('id', pid);
    await syncData();
  }, [syncData]);

  const addSale = useCallback(async (s: Omit<Sale, "id" | "total">) => {
    try {
      const custId = data.customers.find(c => c.name === s.client)?.id || null;
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.rpc('register_sale', {
        p_stock_item_id: s.stockItemId || null,
        p_customer_id: custId,
        p_product_name: s.productName,
        p_quantity: s.quantity,
        p_unit_price: s.unitPrice,
        p_date: s.date,
        p_created_by: userData.user?.id || null
      });
      
      if (error) throw error;
      await syncData();
      return { ok: true };
    } catch (err: any) {
      console.error(err);
      return { ok: false, error: err.message };
    }
  }, [data.customers, syncData]);

  const removeSale = useCallback(async (sid: string) => {
    await supabase.from('sales').delete().eq('id', sid);
    await syncData();
  }, [syncData]);

  const updateSettings = useCallback(async (s: Partial<Settings>) => {
    // Atualização otimista
    setData((d) => ({ ...d, settings: { ...d.settings, ...s } }));

    if (!settingsId) return;

    const payload: any = {};
    if (s.hourlyRate !== undefined) payload.hourly_rate = s.hourlyRate;
    if (s.filamentPricePerGram !== undefined) payload.filament_price_per_gram = s.filamentPricePerGram;
    if (s.marginPct !== undefined) payload.margin_pct = s.marginPct;
    if (s.extraCost !== undefined) payload.extra_cost = s.extraCost;
    payload.updated_at = new Date().toISOString();

    await supabase.from('settings').update(payload).eq('id', settingsId);
  }, [settingsId]);

  const addFilament = useCallback(async (f: Omit<FilamentStock, "id">) => {
    const newId = crypto.randomUUID();
    const newFilament: FilamentStock = { ...f, id: newId };
    setData((d) => ({ ...d, filaments: [newFilament, ...d.filaments] }));
    await supabase.from('filaments').insert({
      id: newId,
      supplier_id: f.supplierId || null,
      name: f.name,
      type: f.type,
      color: f.color,
      grams: f.grams,
      price_per_gram: f.pricePerGram || null
    });
    await syncData(); // Garante persistência no reload
  }, [syncData]);
  const updateFilament = useCallback(async (fid: string, patch: Partial<FilamentStock>) => {
    setData((d) => ({ ...d, filaments: d.filaments.map((f) => (f.id === fid ? { ...f, ...patch } : f)) }));
    const payload: any = {};
    if (patch.supplierId !== undefined) payload.supplier_id = patch.supplierId || null;
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.type !== undefined) payload.type = patch.type;
    if (patch.color !== undefined) payload.color = patch.color;
    if (patch.grams !== undefined) payload.grams = patch.grams;
    if (patch.pricePerGram !== undefined) payload.price_per_gram = patch.pricePerGram || null;
    await supabase.from('filaments').update(payload).eq('id', fid);
  }, []);
  const removeFilament = useCallback(async (fid: string) => {
    setData((d) => ({ ...d, filaments: d.filaments.filter((f) => f.id !== fid) }));
    await supabase.from('filaments').delete().eq('id', fid);
  }, []);

  const addCustomer = useCallback(async (c: Omit<Customer, "id" | "createdAt">) => {
    const newId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const newCustomer: Customer = { ...c, id: newId, createdAt };
    setData((d) => ({ ...d, customers: [newCustomer, ...d.customers] }));
    await supabase.from('customers').insert({
      id: newId,
      name: c.name,
      contact: c.contact || null,
      email: c.email || null,
      notes: c.notes || null,
      created_at: createdAt
    });
    await syncData();
  }, [syncData]);
  const updateCustomer = useCallback(async (cid: string, patch: Partial<Customer>) => {
    setData((d) => ({ ...d, customers: d.customers.map((c) => (c.id === cid ? { ...c, ...patch } : c)) }));
    const payload: any = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.contact !== undefined) payload.contact = patch.contact || null;
    if (patch.email !== undefined) payload.email = patch.email || null;
    if (patch.notes !== undefined) payload.notes = patch.notes || null;
    await supabase.from('customers').update(payload).eq('id', cid);
  }, []);
  const removeCustomer = useCallback(async (cid: string) => {
    setData((d) => ({ ...d, customers: d.customers.filter((c) => c.id !== cid) }));
    await supabase.from('customers').delete().eq('id', cid);
  }, []);

  const addSupplier = useCallback(async (s: Omit<Supplier, "id" | "createdAt">) => {
    const newId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const newSupplier: Supplier = { ...s, id: newId, createdAt };
    setData((d) => ({ ...d, suppliers: [newSupplier, ...d.suppliers] }));
    await supabase.from('suppliers').insert({
      id: newId,
      name: s.name,
      contact: s.contact || null,
      email: s.email || null,
      notes: s.notes || null,
      created_at: createdAt
    });
    await syncData();
  }, [syncData]);
  const updateSupplier = useCallback(async (sid: string, patch: Partial<Supplier>) => {
    setData((d) => ({ ...d, suppliers: d.suppliers.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }));
    const payload: any = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.contact !== undefined) payload.contact = patch.contact || null;
    if (patch.email !== undefined) payload.email = patch.email || null;
    if (patch.notes !== undefined) payload.notes = patch.notes || null;
    await supabase.from('suppliers').update(payload).eq('id', sid);
  }, []);
  const removeSupplier = useCallback(async (sid: string) => {
    setData((d) => ({ ...d, suppliers: d.suppliers.filter((s) => s.id !== sid) }));
    await supabase.from('suppliers').delete().eq('id', sid);
  }, []);

  const resetAll = useCallback(() => {}, []);

  return (
    <StoreContext.Provider
      value={{
        data,
        addTransaction, removeTransaction,
        addProduction, updateProductionStatus, removeProduction,
        addSale, removeSale,
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

// Converte horas decimais (ex: 2.4) — sempre tratado como decimal puro.
export function formatHoursDecimal(h: number): string {
  if (!h || h <= 0) return "0h";
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  if (hh === 0) return `${mm}min`;
  if (mm === 0) return `${hh}h`;
  return `${hh}h ${mm}min`;
}

export type { FilamentUsage };
