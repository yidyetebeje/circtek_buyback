import { Model } from "@/types/catalog";
import { DefaultCheckout } from "./DefaultCheckout";
import { SplitCheckout } from "./SplitCheckout";
import { MinimalistCheckout } from "./MinimalistCheckout";
import { SteppedCheckout } from "./SteppedCheckout";
import { CardCheckout } from "./CardCheckout";

export interface CheckoutVariantProps {
  currentLocale: string;
  defaultLocale: string;
  primaryColor: string;
  backgroundColor?: string;
  deviceId?: string; // Optional device ID for single-device checkout flow
}

export type CheckoutVariantType = 'default' | 'split' | 'minimalist' | 'stepped' | 'card';

export const CheckoutVariants = {
  default: DefaultCheckout,
  split: SplitCheckout,
  minimalist: MinimalistCheckout,
  stepped: SteppedCheckout,
  card: CardCheckout
}; 