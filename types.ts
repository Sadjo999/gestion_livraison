
export interface Delivery {
  id: string;
  created_at?: string;
  delivery_date: string;
  sand_type: string;
  volume: number;        // en m³
  unit_price: number;    // prix par m³
  gross_amount: number;  // volume * unit_price
  management_share: number; // 3m³ * unit_price
  other_fees: number;       // "Autres frais" déduits de management_share
  partner_share: number;    // gross_amount - management_share
  agent_commission: number; // 35% de (management_share - other_fees)
  management_net: number;    // 65% de (management_share - other_fees)
  client: string;
  payment_date: string | null;
  commission_rate: number; // stored for reference (legacy or custom)
  commission_amount: number; // stored for reference
  net_amount: number;     // for backward compatibility, same as management_net or relevant total
  truck_number: string;
  notes?: string;
  user_id: string; // Required for isolation
  profiles?: { first_name: string; last_name: string };
  payments?: Payment[];
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  is_password_reset_required: boolean;
  created_at: string;
}

export interface FinancialStats {
  totalGross: number;
  totalCommission: number; // Part agent
  totalNet: number; // Réellement encaissé
  totalDebt: number;
  invoiceCount: number;
  totalNetTheoretical?: number; // Net direction théorique
  totalPartner?: number;
  totalManagementShare?: number;
  totalOtherFees?: number;
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
  id?: string;
  user_id?: string;
  defaultCommissionRate: number;
  customSandTypes: string[];
  granitePrices: Record<string, number>; // Mapping type -> prix/m³
  currencySymbol: string;
  paymentMethods: string[];
  otherFees: number;
}

export enum SandCategory {
  ZERO_FORTY = "30m³ de 0/40",
  EIGHT_SIXTEEN = "30m³ de 8/16",
  FOUR_EIGHT = "30m³ de 4/8",
  OTHER = "Autre"
}
