export interface CurrencySymbol {
  id: number;
  tenant_id: number;
  code: string;
  symbol: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string | null;
  created_by: number | null;
  updated_at: string | null;
  updated_by: number | null;
}

export interface CurrencySymbolCreate {
  code: string;
  symbol: string;
  label: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface CurrencySymbolUpdate {
  code?: string;
  symbol?: string;
  label?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface UserCurrencyPreference {
  user_id: number;
  tenant_id: number;
  currency_code: string;
  updated_at: string | null;
}

export interface CurrencyResolved {
  code: string;
  symbol: string;
  source: 'user' | 'tenant_default' | 'system_default';
}

export interface CurrencyPreferenceUpdate {
  code: string;
}

// Local storage interface for client-side state
export interface CurrencyState {
  code: string;
  symbol: string;
}