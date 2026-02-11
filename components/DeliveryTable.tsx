import React, { useState, useMemo } from 'react';
import { Delivery, AppSettings } from '../types';
import { formatCurrency, getCumulativeBalances, getRemainingBalance } from '../utils/finance';
import { Search, Filter, Download, Trash2, Edit, Edit2, ChevronLeft, ChevronRight, Calculator, Banknote, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PaymentModal } from './PaymentModal';

interface DeliveryTableProps {
  deliveries: Delivery[];
  settings: AppSettings;
  onDelete: (id: string) => void;
  onEdit: (delivery: Delivery) => void;
  onRefresh: () => void;
}

const DeliveryTable: React.FC<DeliveryTableProps> = ({ deliveries, settings, onDelete, onEdit, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeliveryForPayments, setSelectedDeliveryForPayments] = useState<Delivery | null>(null);
  const [filterSand, setFilterSand] = useState<string>('');
  const [filterTruck, setFilterTruck] = useState<string>('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [commissionOnly, setCommissionOnly] = useState<boolean | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    let result = [...deliveries];

    if (searchTerm) {
      result = result.filter(d =>
        d.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.truck_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterSand) result = result.filter(d => d.sand_type === filterSand);
    if (filterTruck) result = result.filter(d => d.truck_number === filterTruck);
    if (dateStart) result = result.filter(d => d.delivery_date >= dateStart);
    if (dateEnd) result = result.filter(d => d.delivery_date <= dateEnd);
    if (commissionOnly !== null) {
      result = result.filter(d => commissionOnly ? d.commission_rate > 0 : d.commission_rate === 0);
    }

    return getCumulativeBalances(result).sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
  }, [deliveries, searchTerm, filterSand, filterTruck, dateStart, dateEnd, commissionOnly]);

  const uniqueTrucks = useMemo(() => Array.from(new Set(deliveries.map(d => d.truck_number))), [deliveries]);
  const uniqueSand = useMemo(() => Array.from(new Set(deliveries.map(d => d.sand_type))), [deliveries]);

  const generatePDF = () => {
    const doc = new jsPDF() as any;

    doc.setFontSize(20);
    doc.text('SandLogix - Rapport de Livraisons', 14, 22);
    doc.setFontSize(10);
    doc.text(`Généré le: ${new Date().toLocaleString()}`, 14, 30);

    const tableColumn = ["Date", "Camion", "Client", "Type", "Vol(m³)", "Prix/m³", "Brut", "Part Part.", "Comm Agent", "Net Dir.", "Payé", "Reste"];
    const tableRows = filteredData.map(d => {
      const paid = d.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const remaining = d.management_net - paid;
      return [
        d.delivery_date,
        d.truck_number,
        d.client,
        d.sand_type,
        d.volume,
        formatCurrency(d.unit_price),
        formatCurrency(d.gross_amount),
        formatCurrency(d.partner_share),
        formatCurrency(d.agent_commission),
        formatCurrency(d.management_net),
        formatCurrency(paid),
        formatCurrency(remaining)
      ];
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [180, 83, 9], textColor: 255 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20 }, // Date
        1: { cellWidth: 20 }, // Camion
        2: { cellWidth: 30 }, // Client
        3: { cellWidth: 25 }, // Sable
        4: { cellWidth: 20 }, // Brut
        5: { cellWidth: 15 }, // Comm
        6: { cellWidth: 20 }, // Net
        7: { cellWidth: 20 }, // Payé
        8: { cellWidth: 20 }  // Reste
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;
    const totalBrut = filteredData.reduce((s, c) => s + c.gross_amount, 0);
    const totalPartner = filteredData.reduce((s, c) => s + c.partner_share, 0);
    const totalManagementNet = filteredData.reduce((s, c) => s + c.management_net, 0);
    const totalAgentComm = filteredData.reduce((s, c) => s + c.agent_commission, 0);
    const totalPaid = filteredData.reduce((s, c) => s + (c.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0), 0);
    const totalRemaining = totalManagementNet - totalPaid;

    doc.setFontSize(10);
    doc.text(`TOTAL BRUT: ${formatCurrency(totalBrut)}`, 14, finalY + 10);
    doc.text(`TOTAL NET (Gain): ${formatCurrency(totalManagementNet)}`, 14, finalY + 17);
    doc.text(`TOTAL ENCAISSÉ: ${formatCurrency(totalPaid)}`, 140, finalY + 10);
    doc.text(`RESTE À RECOUVRER: ${formatCurrency(totalRemaining)}`, 140, finalY + 17);

    doc.save(`sandlogix_rapport_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher client ou camion..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={generatePDF}
            className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md shadow-slate-200"
          >
            <Download className="w-5 h-5" />
            <span className="md:inline hidden">Exporter PDF</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center overflow-x-auto no-scrollbar pb-1">
          <select
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 focus:ring-0 outline-none"
            value={filterSand}
            onChange={e => setFilterSand(e.target.value)}
          >
            <option value="">Tous les sables</option>
            {uniqueSand.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <select
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 focus:ring-0 outline-none"
            value={filterTruck}
            onChange={e => setFilterTruck(e.target.value)}
          >
            <option value="">Tous les camions</option>
            {uniqueTrucks.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 outline-none"
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
            />
            <input
              type="date"
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 outline-none"
              value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="px-4 py-4">Date</th>
                <th className="px-4 py-4">Camion</th>
                <th className="px-4 py-4">Client</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4 text-right">Vol (m³)</th>
                <th className="px-4 py-4 text-right">Prix/m³</th>
                <th className="px-4 py-4 text-right">Brut</th>
                <th className="px-4 py-4 text-right text-slate-400">Part Part.</th>
                <th className="px-4 py-4 text-right text-amber-600">Comm Agent</th>
                <th className="px-4 py-4 text-right text-emerald-600">Net Dir.</th>
                <th className="px-4 py-4 text-right">Payé</th>
                <th className="px-4 py-4 text-right">Reste</th>
                <th className="px-4 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((d) => {
                const paid = d.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                const remaining = d.gross_amount - paid;
                return (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-4 font-mono text-[11px] text-slate-500">{d.delivery_date}</td>
                    <td className="px-4 py-4 font-bold text-amber-600">{d.truck_number}</td>
                    <td className="px-4 py-4 font-semibold text-slate-800">{d.client}</td>
                    <td className="px-4 py-4 text-slate-500 text-xs">{d.sand_type}</td>
                    <td className="px-4 py-4 text-right font-mono text-xs">{d.volume}</td>
                    <td className="px-4 py-4 text-right font-mono text-xs italic text-slate-400">{formatCurrency(d.unit_price)}</td>
                    <td className="px-4 py-4 text-right text-xs">{formatCurrency(d.gross_amount)}</td>
                    <td className="px-4 py-4 text-right text-slate-400 text-xs">{formatCurrency(d.partner_share)}</td>
                    <td className="px-4 py-4 text-right text-amber-600 text-xs font-bold">{formatCurrency(d.agent_commission)}</td>
                    <td className="px-4 py-4 text-right font-bold text-emerald-600 border-l border-slate-50">
                      {formatCurrency(d.management_net)}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-blue-600">
                      {formatCurrency(paid)}
                    </td>
                    <td className={`px-4 py-4 text-right font-black ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600 bg-emerald-50/30'}`}>
                      {formatCurrency(remaining)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedDeliveryForPayments(d)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Gérer les paiements"
                        >
                          <Banknote className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(d)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(d.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-bold">
              <tr>
                <td colSpan={6} className="px-4 py-4 text-right text-[10px] uppercase tracking-widest text-slate-400">Totaux Réalisés</td>
                <td className="px-4 py-4 text-right border-l border-slate-800">{formatCurrency(filteredData.reduce((s, c) => s + c.gross_amount, 0))}</td>
                <td className="px-4 py-4 text-right border-l border-slate-800 text-slate-400 text-xs">{formatCurrency(filteredData.reduce((s, c) => s + (c.partner_share || 0), 0))}</td>
                <td className="px-4 py-4 text-right border-l border-slate-800 text-amber-400 text-xs">{formatCurrency(filteredData.reduce((s, c) => s + (c.agent_commission || 0), 0))}</td>
                <td className="px-4 py-4 text-right border-l border-slate-800 text-emerald-400">{formatCurrency(filteredData.reduce((s, c) => s + (c.management_net || 0), 0))}</td>
                <td className="px-4 py-4 text-right border-l border-slate-800 text-blue-400">
                  {formatCurrency(filteredData.reduce((s, c) => s + (c.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0), 0))}
                </td>
                <td className="px-4 py-4 text-right border-l border-slate-800 text-rose-400">
                  {formatCurrency(
                    filteredData.reduce((s, c) => s + (c.management_net || 0), 0) -
                    filteredData.reduce((s, c) => s + (c.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0), 0)
                  )}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredData.map((d) => (
          <div key={d.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{d.delivery_date}</p>
                <h4 className="font-bold text-slate-800 text-lg">{d.client}</h4>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(d)} className="p-2 bg-slate-50 text-slate-400 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => onDelete(d.id)} className="p-2 bg-rose-50 text-rose-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex justify-between items-end border-t border-slate-50 pt-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{d.truck_number}</span>
                  <span className="text-xs text-slate-500">{d.sand_type}</span>
                </div>
                <p className="text-xs text-emerald-600 font-bold">Reste: {formatCurrency(getRemainingBalance(d))}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 line-through mb-1">{formatCurrency(d.gross_amount)}</p>
                <p className={`text-xl font-black ${d.net_amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatCurrency(d.net_amount)}
                </p>
              </div>
            </div>

            {/* Expandable info for mobile if needed */}
            <button
              onClick={() => setExpandedRow(expandedRow === d.id ? null : d.id)}
              className="w-full text-center text-slate-300 py-1"
            >
              {expandedRow === d.id ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
            </button>
            {expandedRow === d.id && (
              <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-50 text-slate-600">
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-tighter text-[9px]">Comm (%)</span>
                  {d.commission_rate}%
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-tighter text-[9px]">Comm (val)</span>
                  {formatCurrency(d.commission_amount)}
                </div>
                {d.notes && <div className="col-span-2 italic text-slate-400">"{d.notes}"</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="bg-white py-12 px-6 text-center rounded-2xl border border-slate-200 text-slate-400 italic">
          Aucune livraison trouvée pour les critères sélectionnés.
        </div>
      )}
      {selectedDeliveryForPayments && (
        <PaymentModal
          delivery={selectedDeliveryForPayments}
          settings={settings} // Need to pass settings to Table or use Context
          isOpen={true}
          onClose={() => setSelectedDeliveryForPayments(null)}
          onUpdate={onRefresh} // callback to refetch data
        />
      )}
    </div>
  );
};

export default DeliveryTable;
