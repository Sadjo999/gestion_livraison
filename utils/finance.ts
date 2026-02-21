
import { Delivery } from '../types';

export const calculateCommission = (gross: number, rate: number): number => {
  return (gross * rate) / 100;
};

/**
 * Logic for granite deliveries:
 * 1. Max 30m³ per truck. Min 10m³ per truck.
 * 2. Each truck counts for 3m³ of Management Share.
 * 3. Management Share = truckCount * 3 * unitPrice
 * 4. Partner Share = (Total Volume - (truckCount * 3)) * unitPrice
 * 5. Agent Commission = X% of Management Share
 * 6. Management Net = Management Share - Agent Commission
 */
export const calculateGraniteFinances = (volume: number, unitPrice: number, agentRate: number = 35, otherFees: number = 0) => {
  const truckCount = Math.max(1, Math.ceil(volume / 30));
  const managementVolume = truckCount * 3;

  const grossAmount = volume * unitPrice;
  const managementShare = managementVolume * unitPrice;
  const partnerShare = Math.max(0, volume - managementVolume) * unitPrice;

  // Soustraire les autres frais avant de partager entre l'agent et la direction
  const managementRemaining = Math.max(0, managementShare - otherFees);

  const agentCommission = (managementRemaining * agentRate) / 100;
  const managementNet = managementRemaining - agentCommission;

  return {
    grossAmount,
    managementShare,
    partnerShare,
    agentCommission,
    managementNet,
    truckCount,
    otherFees
  };
};

export const calculateNet = (gross: number, commission: number): number => {
  return gross - commission;
};

export const formatCurrency = (amount: number): string => {
  if (amount === undefined || amount === null) return "0 GNF";
  return Math.round(amount).toLocaleString('fr-FR').replace(/\s/g, ' ') + " GNF";
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
