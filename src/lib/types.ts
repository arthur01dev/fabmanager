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
  filamentId?: string;
  name: string;
  grams: number;
}

export interface ProductionItem {
  id: string;
  name: string;
  client?: string;
  status: ProductionStatus;
  startDate: string;
  endDate?: string;
  estimatedHours: number;
  filaments: FilamentUsage[];
  filamentGrams: number;
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
  name: string;
  color?: string;
  type?: string;
  grams: number;
  pricePerGram?: number;
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
  paymentMethod?: string;
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
