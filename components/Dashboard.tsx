
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie, Legend } from 'recharts';
import { Delivery, FinancialStats } from '../types';
import { formatCurrency } from '../utils/finance';
import StatCard from './StatCard';
import { TrendingUp, Wallet, Percent, AlertCircle, ShoppingCart, Truck } from 'lucide-react';

interface Props {
  deliveries: Delivery[];
  stats: FinancialStats;
}

const Dashboard: React.FC<Props> = ({ deliveries, stats }) => {
  // Aggregate data for charts
  const sandTypeData = React.useMemo(() => {
    const groups = deliveries.reduce((acc, curr) => {
      acc[curr.sand_type] = (acc[curr.sand_type] || 0) + curr.gross_amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [deliveries]);

  const clientData = React.useMemo(() => {
    const groups = deliveries.reduce((acc, curr) => {
      acc[curr.client] = (acc[curr.client] || 0) + (curr.management_net || 0);
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 5);
  }, [deliveries]);

  const timelineData = React.useMemo(() => {
    const sorted = [...deliveries].sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime());
    return sorted.map(d => {
      const paid = d.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      return {
        date: d.delivery_date,
        net: paid, // Use actual paid amount for the "Net" line
        gross: d.gross_amount
      };
    }).slice(-10);
  }, [deliveries]);

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8">
      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CA Brut Total"
          value={formatCurrency(stats.totalGross)}
          icon={<ShoppingCart className="text-blue-500" />}
          color="blue"
        />
        <StatCard
          title="Part Partenaires"
          value={formatCurrency(stats.totalPartner || 0)}
          icon={<TrendingUp className="text-slate-400" />}
          color="slate"
          subtitle="Argent dû aux chinois"
        />
        <StatCard
          title="Part Direction (Gross)"
          value={formatCurrency(stats.totalManagementShare || 0)}
          icon={<ShoppingCart className="text-indigo-500" />}
          color="indigo"
          subtitle="Valeur cumulée des 3m³"
        />
        <StatCard
          title="Comm. Agents"
          value={formatCurrency(stats.totalCommission)}
          icon={<Percent className="text-amber-500" />}
          color="amber"
          subtitle="Part payée aux apporteurs"
        />
        <StatCard
          title="Net Direction (Théo)"
          value={formatCurrency(stats.totalNetTheoretical || 0)}
          icon={<Percent className="text-emerald-500" />}
          color="emerald"
          subtitle="Gain direction après commissions"
        />
        <StatCard
          title="Réel Encaissé (Direction)"
          value={formatCurrency(stats.totalNet)}
          icon={<Wallet className="text-emerald-600" />}
          color="emerald"
          subtitle="Argent direction en caisse"
        />
        <StatCard
          title="Dettes Clients"
          value={formatCurrency(stats.totalDebt)}
          icon={<AlertCircle className="text-rose-500" />}
          color="rose"
          subtitle="Reste à recouvrer total"
        />
        <StatCard
          title="Livraisons"
          value={stats.invoiceCount.toString()}
          icon={<Truck className="text-indigo-400" />}
          color="indigo"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Timeline Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-400" />
            Évolution Brut vs Net
          </h3>
          <div style={{ width: '100%', height: '300px', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip
                  formatter={(val: number) => formatCurrency(val)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="gross" stroke="#3b82f6" name="Brut" strokeWidth={2} />
                <Line type="monotone" dataKey="net" stroke="#10b981" name="Net" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sand Type Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-6">Répartition par Type de Sable</h3>
          <div style={{ width: '100%', height: '300px', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sandTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {sandTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-6">Top 5 Clients (par Montant Net)</h3>
          <div style={{ width: '100%', height: '300px', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" fontSize={10} hide />
                <YAxis dataKey="name" type="category" fontSize={12} width={120} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
