
import { Delivery } from '../types';

export const calculateCommission = (gross: number, rate: number): number => {
  return (gross * rate) / 100;
};

/**
 * New calculation logic for granite deliveries:
 * 1. Management Share = 3m³ * unitPrice
 * 2. Partner Share = (Volume - 3) * unitPrice
 * 3. Agent Commission = 35% of Management Share
 * 4. Management Net = 65% of Management Share
 */
export const calculateGraniteFinances = (volume: number, unitPrice: number, agentRate: number = 35) => {
  const grossAmount = volume * unitPrice;
  const managementShare = Math.min(3, volume) * unitPrice; // If volume < 3, management takes all
  const partnerShare = Math.max(0, volume - 3) * unitPrice;

  const agentCommission = (managementShare * agentRate) / 100;
  const managementNet = managementShare - agentCommission;

  return {
    grossAmount,
    managementShare,
    partnerShare,
    agentCommission,
    managementNet
  };
};

export const calculateNet = (gross: number, commission: number): number => {
  return gross - commission;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'GNF', // Guinean Franc
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getRemainingBalance = (delivery: Delivery): number => {
  const paid = delivery.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  return delivery.gross_amount - paid;
};

export const getCumulativeBalances = (deliveries: Delivery[]): (Delivery & { runningBalance: number })[] => {
  const sorted = [...deliveries].sort((a, b) =>
    new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime()
  );

  let total = 0;
  return sorted.map(d => {
    total += d.net_amount;
    return { ...d, runningBalance: total };
  });
};
