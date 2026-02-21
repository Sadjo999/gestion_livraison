
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie, Legend } from 'recharts';
import { Delivery, FinancialStats, Profile } from '../types';
import { formatCurrency } from '../utils/finance';
import StatCard from './StatCard';
import { TrendingUp, Wallet, Percent, AlertCircle, ShoppingCart, Truck, Users as UsersIcon } from 'lucide-react';

interface Props {
  deliveries: Delivery[];
  stats: FinancialStats;
  profiles?: Profile[];
  onUserFilter?: (userId: string | null) => void;
  selectedUserId?: string | null;
}

const Dashboard: React.FC<Props> = ({ deliveries, stats, profiles, onUserFilter, selectedUserId }) => {
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
    <div className="space-y-8 animate-slide-up">
      {/* Simplified Filter Bar */}
      {profiles && profiles.length > 0 && onUserFilter && (
        <div className="bg-white border border-slate-200 p-2 rounded-xl flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
          <div className="flex items-center gap-3 px-3 py-1 flex-1">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
              <UsersIcon className="text-slate-500 w-4 h-4" />
            </div>
            <div className="flex-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Filtrage des Opérations</label>
              <select
                value={selectedUserId || ''}
                onChange={(e) => onUserFilter(e.target.value || null)}
                className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none border-none cursor-pointer p-0"
              >
                <option value="">Vue Console Globale</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-1 p-1">
            <button
              onClick={() => onUserFilter(null)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${!selectedUserId ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Globale
            </button>
          </div>
        </div>
      )}

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard
          title="CA Brut Total"
          value={formatCurrency(stats.totalGross)}
          icon={<ShoppingCart />}
          color="blue"
        />
        <StatCard
          title="Part Partenaires"
          value={formatCurrency(stats.totalPartner || 0)}
          icon={<TrendingUp />}
          color="slate"
          subtitle="Quote-part carrières"
        />
        <StatCard
          title="Direction (Brut)"
          value={formatCurrency(stats.totalManagementShare || 0)}
          icon={<Truck />}
          color="indigo"
          subtitle="Valeur cumulée"
        />
        <StatCard
          title="Net Direction (Théo)"
          value={formatCurrency(stats.totalNetTheoretical || 0)}
          icon={<Percent />}
          color="amber"
          subtitle="Après commissions"
        />
        <StatCard
          title="Réel Encaissé"
          value={formatCurrency(stats.totalNet)}
          icon={<Wallet />}
          color="emerald"
          subtitle="En caisse (Direction)"
        />
        <StatCard
          title="Dettes Clients"
          value={formatCurrency(stats.totalDebt)}
          icon={<AlertCircle />}
          color="rose"
          subtitle="Reste à recouvrer"
        />
        <StatCard
          title="Livraisons"
          value={stats.invoiceCount.toString()}
          icon={<Truck />}
          color="indigo"
        />
        <StatCard
          title="Commissions Agents"
          value={formatCurrency(stats.totalCommission || 0)}
          icon={<Percent />}
          color="amber"
          subtitle="Part totale due"
        />
        <StatCard
          title="Autres Frais"
          value={formatCurrency(stats.totalOtherFees || 0)}
          icon={<AlertCircle />}
          color="rose"
          subtitle="Total déduit"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Timeline Chart */}
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-lexend tracking-tight">Flux de Trésorerie</h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Brut vs Encaissé</p>
            </div>
            <TrendingUp className="w-5 h-5 text-slate-300" />
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" fontSize={9} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                <YAxis fontSize={9} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val), '']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '8px', fontSize: '10px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="gross" stroke="#3b82f6" name="Total Brut" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="net" stroke="#10b981" name="Net Encaissé" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sand Type Pie Chart */}
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-lexend tracking-tight">Répartition Marché</h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Volume par Granulométrie</p>
            </div>
            <ShoppingCart className="w-5 h-5 text-slate-300" />
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sandTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {sandTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => formatCurrency(val)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Bar Chart */}
        <div className="premium-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-lexend tracking-tight">Performance Clients</h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Top 5 par Contribution Net</p>
            </div>
            <Wallet className="w-5 h-5 text-slate-300" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" fontSize={9} hide />
                <YAxis dataKey="name" type="category" fontSize={11} width={100} axisLine={false} tickLine={false} tick={{ fontWeight: '600', fill: '#475569' }} />
                <Tooltip
                  formatter={(val: number) => formatCurrency(val)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
