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
    try {
      const doc = new jsPDF({ orientation: 'landscape' }) as any;
      const pageWidth = doc.internal.pageSize.width;

      // Top Bar Accent
      doc.setFillColor(245, 158, 11); // Amber-500
      doc.rect(0, 0, pageWidth, 2, 'F');

      // Header Background
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 2, pageWidth, 43, 'F');

      // Logo & Title
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.8);
      doc.line(14, 15, 14, 30); // Vertical accent line

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text('GranitLogix', 18, 24);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text('SYSTEME DE GESTION DE LIVRAISON', 18, 30);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(`DATE DU RAPPORT : ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 14, 20, { align: 'right' });
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`HEURE : ${new Date().toLocaleTimeString('fr-FR')}`, pageWidth - 14, 25, { align: 'right' });

      // Secondary Info Bar
      doc.setFillColor(51, 65, 85); // Slate-700
      doc.rect(0, 37, pageWidth, 8, 'F');

      let filterText = 'CRITÈRES APPLIQUÉS : ';
      if (searchTerm) filterText += `RECHERCHE: "${searchTerm.toUpperCase()}" | `;
      if (filterSand) filterText += `TYPE: ${filterSand.toUpperCase()} | `;
      if (filterTruck) filterText += `CAMION: ${filterTruck.toUpperCase()} | `;
      if (dateStart || dateEnd) filterText += `PÉRIODE: ${dateStart || 'ORIGINE'} AU ${dateEnd || 'AUJOURDHUI'} | `;
      if (filterText === 'CRITÈRES APPLIQUÉS : ') filterText += 'TOUTES LES DONNÉES DISPONIBLES';
      else filterText = filterText.slice(0, -3);

      doc.setFontSize(7);
      doc.setTextColor(203, 213, 225);
      doc.setFont("helvetica", "bold");
      doc.text(filterText, 14, 42.5);

      const tableColumn = ["DATE", "CAMION", "CLIENT", "TYPE", "VOL(m³)", "TR.", "BRUT", "PART P.", "COMM. AG.", "NET DIR.", "PAYÉ", "RESTE"];
      const tableRows = filteredData.map(d => {
        const paid = d.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const remaining = Math.max(0, d.gross_amount - paid);

        // Calculate truck count (redundant if already in DB, but good to ensure consistency)
        const truckCount = Math.max(1, Math.ceil(d.volume / 30));

        return [
          d.delivery_date,
          d.truck_number,
          d.client,
          d.sand_type,
          Number(d.volume).toLocaleString('fr-FR'),
          `${truckCount} Cam.`,
          formatCurrency(d.gross_amount),
          formatCurrency(d.partner_share),
          formatCurrency(d.agent_commission),
          formatCurrency(d.management_net),
          formatCurrency(paid),
          formatCurrency(remaining)
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 6.5, cellPadding: 1.5 },
        columnStyles: {
          0: { cellWidth: 15 }, // Date
          1: { cellWidth: 15 }, // Camion
          2: { cellWidth: 35 }, // Client
          3: { cellWidth: 20 }, // Type
          4: { halign: 'right', cellWidth: 12 },    // Volume
          5: { halign: 'center', cellWidth: 15 },   // Transp/Trucks
          6: { halign: 'right' },                   // Brut
          7: { halign: 'right' },                   // Part Part
          8: { halign: 'right' },                   // Comm
          9: { halign: 'right' },                   // Net Dir
          10: { halign: 'right' },                  // Payé
          11: { halign: 'right' },                  // Reste
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { font: "helvetica", overflow: 'linebreak', cellPadding: 1 },
        margin: { left: 8, right: 8 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 150;

      // Footer with page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} sur ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        doc.text('GranitLogix - Système de Gestion de Livraison', 14, doc.internal.pageSize.height - 10);
      }

      // Summary Box
      const totalBrut = filteredData.reduce((s, c) => s + c.gross_amount, 0);
      const totalManagementNet = filteredData.reduce((s, c) => s + c.management_net, 0);
      const totalPaid = filteredData.reduce((s, c) => s + (c.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0), 0);
      const totalRemaining = Math.max(0, totalBrut - totalPaid);

      // Ensure summary box is on the same page if possible, or new page
      let summaryY = finalY + 10;
      if (summaryY + 40 > doc.internal.pageSize.height) {
        doc.addPage();
        summaryY = 20;
      }

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, summaryY, pageWidth - 20, 38, 'F');
      doc.rect(10, summaryY, pageWidth - 20, 38, 'S');

      doc.setTextColor(15, 23, 42); // Slate-900
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text('RÉSUMÉ FINANCIER GLOBAL', 20, summaryY + 10);

      // Column 1
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(`CHIFFRE D'AFFAIRES BRUT :`, 20, summaryY + 20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`${formatCurrency(totalBrut)}`, 85, summaryY + 20);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`SURPLUS NET DIRECTION :`, 20, summaryY + 30);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(5, 150, 105); // Emerald-600
      doc.text(`${formatCurrency(totalManagementNet)}`, 85, summaryY + 30);

      // Column 2
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`TOTAL RÉELLEMENT ENCAISSÉ :`, 155, summaryY + 20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`${formatCurrency(totalPaid)}`, 225, summaryY + 20);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`RESTE À RECOUVRER :`, 155, summaryY + 30);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38); // Red-600
      doc.text(`${formatCurrency(totalRemaining)}`, 225, summaryY + 30);

      doc.save(`granitlogix_rapport_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Une erreur est survenue lors de la génération du PDF.");
    }
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
            <option value="">Tous les types</option>
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
                const remaining = Math.max(0, d.gross_amount - paid);
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
                    filteredData.reduce((s, c) => s + c.gross_amount, 0) -
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
      <div className="md:hidden space-y-4">
        {filteredData.map((d) => {
          const paid = d.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
          const remaining = Math.max(0, d.gross_amount - paid);
          const truckCount = Math.max(1, Math.ceil(d.volume / 30));

          return (
            <div key={d.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase truncate max-w-[80px]">
                      {d.truck_number}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.delivery_date}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base leading-tight">{d.client}</h4>
                  <p className="text-xs text-slate-500 font-medium">{d.sand_type} • {d.volume} m³ ({truckCount} Cam.)</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => onEdit(d)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(d.id)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Gain Net Dir.</span>
                  <p className="text-sm font-black text-emerald-600 font-mono">{formatCurrency(d.management_net)}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Reste à Payer</span>
                  <p className={`text-sm font-black font-mono ${remaining > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>
                    {formatCurrency(remaining)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex -space-x-1.5 overflow-hidden">
                  {/* Visual indicator for payments if any */}
                  {d.payments && d.payments.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[10px] font-bold text-blue-600">{d.payments.length} versement(s)</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedDeliveryForPayments(d)}
                  className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors uppercase tracking-widest"
                >
                  Gérer Paiements
                </button>
              </div>

              {/* Expandable info */}
              <button
                onClick={() => setExpandedRow(expandedRow === d.id ? null : d.id)}
                className="w-full flex items-center justify-center gap-1 text-slate-300 py-1 transition-colors hover:text-slate-400"
              >
                <span className="text-[9px] font-bold uppercase tracking-widest">{expandedRow === d.id ? "Moins d'infos" : "Plus d'infos"}</span>
                {expandedRow === d.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {expandedRow === d.id && (
                <div className="bg-slate-50 p-3 rounded-2xl grid grid-cols-2 gap-y-3 text-[11px] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div>
                    <span className="block font-bold text-slate-400 uppercase tracking-tighter text-[9px] mb-0.5">Montant Brut</span>
                    <span className="font-mono text-slate-600">{formatCurrency(d.gross_amount)}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-slate-400 uppercase tracking-tighter text-[9px] mb-0.5">Comm Agent</span>
                    <span className="font-mono text-amber-600 font-bold">-{formatCurrency(d.agent_commission)}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-400 uppercase tracking-tighter text-[9px] mb-0.5">Part Partenaire</span>
                    <span className="font-mono text-slate-500">{formatCurrency(d.partner_share)}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-slate-400 uppercase tracking-tighter text-[9px] mb-0.5">Payé</span>
                    <span className="font-mono text-blue-600 font-bold">{formatCurrency(paid)}</span>
                  </div>
                  {d.notes && (
                    <div className="col-span-2 pt-2 border-t border-slate-200/50 mt-1">
                      <span className="block font-bold text-slate-400 uppercase tracking-tighter text-[9px] mb-0.5">Notes</span>
                      <p className="italic text-slate-500 text-[10px]">"{d.notes}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
