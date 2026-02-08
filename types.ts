
export interface Delivery {
  id: string;
  created_at?: string;
  delivery_date: string;
  sand_type: string;
  client: string;
  payment_date: string | null;
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  truck_number: string;
  notes?: string;
  user_id?: string;
  payments?: Payment[];
}

export interface FinancialStats {
  totalGross: number;
  totalCommission: number;
  totalNet: number;
  totalDebt: number;
  invoiceCount: number;
  totalNetTheoretical?: number;
}

export interface Payment {
  id: string;
  delivery_id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference?: string;
  notes?: string;
}

export interface AppSettings {
  defaultCommissionRate: number;
  customSandTypes: string[];
  currencySymbol: string;
  paymentMethods: string[];
}

export enum SandCategory {
  ZERO_FORTY = "30m³ de 0/40",
  EIGHT_SIXTEEN = "30m³ de 8/16",
  FOUR_EIGHT = "30m³ de 4/8",
  OTHER = "Autre"
}
