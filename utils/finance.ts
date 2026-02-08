
import { Delivery } from '../types';

export const calculateCommission = (gross: number, rate: number): number => {
  return (gross * rate) / 100;
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
