export type TxType = "entrada" | "saida";

export interface Transaction {
  id: string;
  date: string;
  type: TxType;
  category: string;
  description: string;
  amount: number;
}

export type ProductionStatus = "em_producao" | "finalizado";

export interface FilamentUsage {
  filamentId?: string;   // ref ao estoque de filamento
  name: string;          // tipo/cor (ex: "PLA Preto")
  grams: number;
}

export interface ProductionItem {
  id: string;
  name: string;
  client?: string;
  status: ProductionStatus;
  startDate: string;
  endDate?: string;
  estimatedHours: number;        // horas decimais
  filaments: FilamentUsage[];    // múltiplos filamentos
  filamentGrams: number;         // soma total (compat)
  productionCost: number;
  suggestedPrice: number;
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  filamentGrams: number;
  estimatedHours: number;
  productionCost: number;
  suggestedPrice: number;
}

export interface FilamentStock {
  id: string;
  name: string;            // ex: "PLA Preto"
  color?: string;
  type?: string;           // PLA, PETG, ABS...
  grams: number;           // quantidade em estoque (g)
  pricePerGram?: number;   // custo (opcional, sobrepõe global)
  supplierId?: string;
}

export interface Sale {
  id: string;
  date: string;
  productName: string;
  stockItemId?: string;
  customerId?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  client?: string;
}

export interface Customer {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

export interface Settings {
  hourlyRate: number;
  filamentPricePerGram: number;
  marginPct: number;
  extraCost: number;
}

export interface AppData {
  transactions: Transaction[];
  production: ProductionItem[];
  stock: StockItem[];
  sales: Sale[];
  settings: Settings;
  filaments: FilamentStock[];
  customers: Customer[];
  suppliers: Supplier[];
}
