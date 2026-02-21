import React, { useState, useMemo } from 'react';
import { Delivery, AppSettings, Profile } from '../types';
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
  profile?: Profile;
}

const DeliveryTable: React.FC<DeliveryTableProps> = ({ deliveries, settings, onDelete, onEdit, onRefresh, profile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeliveryForPayments, setSelectedDeliveryForPayments] = useState<Delivery | null>(null);
  const [filterSand, setFilterSand] = useState<string>('');
  const [filterTruck, setFilterTruck] = useState<string>('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Get unique agents from deliveries for filtering
  const agents = useMemo(() => {
    const map = new Map();
    deliveries.forEach(d => {
      if (d.profiles && !map.has(d.user_id)) {
        map.set(d.user_id, `${d.profiles.first_name} ${d.profiles.last_name}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [deliveries]);

  const filteredData = useMemo(() => {
    let result = [...deliveries];

    // Agent data isolation
    if (profile && profile.role === 'agent') {
      result = result.filter(d => d.user_id === profile.id);
    }

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
    if (selectedAgentId) result = result.filter(d => d.user_id === selectedAgentId);

    return getCumulativeBalances(result).sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
  }, [deliveries, searchTerm, filterSand, filterTruck, dateStart, dateEnd, selectedAgentId]);

  const uniqueTrucks = useMemo(() => Array.from(new Set(deliveries.map(d => d.truck_number))), [deliveries]);
  const uniqueSand = useMemo(() => Array.from(new Set(deliveries.map(d => d.sand_type))), [deliveries]);

  const generatePDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' }) as any;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // --- Professional Branded Header ---
      // Sidebar accent
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 15, pageHeight, 'F');

      doc.setFillColor(245, 158, 11); // Amber accent
      doc.rect(15, 0, 2, pageHeight, 'F');

      // Top Header
      doc.setFillColor(15, 23, 42);
      doc.rect(17, 0, pageWidth - 17, 45, 'F');

      // Logo & Company Name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text('GRANITLOGIX', 30, 25);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(245, 158, 11); // Amber
      doc.text('SOLUTIONS LOGISTIQUES & GESTION DE MATÉRIAUX', 30, 32);

      // Document Title & ID
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('RELEVÉ D\'ACTIVITÉ DÉTAILLÉ', pageWidth - 20, 25, { align: 'right' });

      const reportRef = `REF: GL-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(reportRef, pageWidth - 20, 32, { align: 'right' });

      // --- Entity Information ---
      doc.setTextColor(30, 41, 59); // slate-800
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text('ÉMIS PAR :', 30, 58);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const actorName = profile ? `${profile.first_name} ${profile.last_name}`.toUpperCase() : "DIRECTION GÉNÉRALE";
      doc.text(actorName, 30, 65);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const actorContact = profile ? `${profile.email} | ${profile.phone || 'Contact non renseigné'}` : "Service Administratif - GranitLogix S.A.R.L";
      doc.text(actorContact, 30, 70);

      // Date & Location Info
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text('DÉTAILS DU RAPPORT :', pageWidth - 80, 58);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - 80, 65);
      doc.text(`Heure : ${new Date().toLocaleTimeString('fr-FR')}`, pageWidth - 80, 70);

      // --- Filters Banner ---
      doc.setDrawColor(226, 232, 240);
      doc.line(30, 78, pageWidth - 20, 78);

      let filterSegments = [];
      if (searchTerm) filterSegments.push(`Client/Camion: ${searchTerm.toUpperCase()}`);
      if (filterSand) filterSegments.push(`Type: ${filterSand}`);
      if (dateStart || dateEnd) {
        const start = dateStart ? new Date(dateStart).toLocaleDateString('fr-FR') : 'Début';
        const end = dateEnd ? new Date(dateEnd).toLocaleDateString('fr-FR') : 'Aujourd\'hui';
        filterSegments.push(`Période: ${start} au ${end}`);
      }

      const filterText = filterSegments.length > 0
        ? `CRITÈRES DE SÉLECTION : ${filterSegments.join(' | ')}`
        : "RAPPORT INTÉGRAL - TOUTES OPÉRATIONS";

      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "italic");
      doc.text(filterText, 30, 85);

      // --- Main Table ---
      const tableColumn = ["DATE", "CAMION", "CLIENT", "SABLE", "VOL(m³)", "MONTANT BRUT", "FR. ANNEXES", "COMMISSION", "NET GESTION", "RECOUVREMENT", "SOLDE"];
      const tableRows = filteredData.map(d => {
        const paid = d.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const remaining = Math.max(0, d.gross_amount - paid);
        return [
          d.delivery_date,
          d.truck_number,
          d.client.toUpperCase(),
          d.sand_type,
          Number(d.volume).toFixed(1),
          formatCurrency(d.gross_amount),
          formatCurrency(d.other_fees || 0),
          formatCurrency(d.agent_commission),
          formatCurrency(d.management_net),
          formatCurrency(paid),
          formatCurrency(remaining)
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 92,
        theme: 'striped',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: 255,
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 3
        },
        bodyStyles: { fontSize: 7, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 16, halign: 'center' },
          1: { cellWidth: 18 },
          2: { cellWidth: 32 },
          4: { halign: 'right', cellWidth: 12 },
          5: { halign: 'right', fontStyle: 'bold' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right', fontStyle: 'bold', textColor: [30, 64, 175] }, // blue-800
          9: { halign: 'right', textColor: [5, 150, 105] },
          10: { halign: 'right', textColor: [185, 28, 28], fontStyle: 'bold' },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { font: "helvetica", overflow: 'linebreak' },
        margin: { left: 20, right: 15 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 150;

      // --- Analytical Summary Card ---
      const totalBrut = filteredData.reduce((s, c) => s + c.gross_amount, 0);
      const totalCommissionsAgent = filteredData.reduce((s, c) => s + (c.agent_commission || 0), 0);
      const totalOtherFees = filteredData.reduce((s, c) => s + (c.other_fees || 0), 0);
      const totalManagementNet = filteredData.reduce((s, c) => s + c.management_net, 0);
      const totalPaid = filteredData.reduce((s, c) => s + (c.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0), 0);
      const totalRemaining = Math.max(0, totalBrut - totalPaid);

      let summaryY = finalY + 15;
      if (summaryY + 80 > pageHeight) {
        doc.addPage();
        summaryY = 20;
      }

      // Title for Summary
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text('RÉSUMÉ FINANCIER CONSOLIDÉ', 30, summaryY);

      // KPI Boxes
      const boxWidth = (pageWidth - 50) / 3;
      const boxHeight = 22;

      const drawStatBox = (x: number, y: number, label: string, value: string, color: [number, number, number]) => {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y + 5, boxWidth - 5, boxHeight, 2, 2, 'FD');

        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "bold");
        doc.text(label, x + 5, y + 11);

        doc.setFontSize(9);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(value, x + 5, y + 20);
      };

      // Row 1
      drawStatBox(30, summaryY, 'CHIFFRE D\'AFFAIRES BRUT', formatCurrency(totalBrut), [15, 23, 42]);
      drawStatBox(30 + boxWidth, summaryY, 'TOTAL NET DIRECTION', formatCurrency(totalManagementNet), [30, 64, 175]);
      drawStatBox(30 + boxWidth * 2, summaryY, 'COMMISSIONS AGENTS', formatCurrency(totalCommissionsAgent), [217, 119, 6]);

      // Row 2
      const row2Y = summaryY + boxHeight + 8;
      drawStatBox(30, row2Y, 'AUTRES FRAIS DÉDUITS', formatCurrency(totalOtherFees), [185, 28, 28]);
      drawStatBox(30 + boxWidth, row2Y, 'TOTAL ENCAISSEMENTS', formatCurrency(totalPaid), [5, 150, 105]);
      drawStatBox(30 + boxWidth * 2, row2Y, 'SOLDE À RECOUVRER', formatCurrency(totalRemaining), [100, 116, 139]);

      summaryY = row2Y + boxHeight; // Update summaryY for signature section

      // --- Validation Section (Signature) ---
      const signatureY = summaryY + 50;
      doc.setDrawColor(203, 213, 225);
      doc.line(30, signatureY, 100, signatureY);
      doc.line(pageWidth - 100, signatureY, pageWidth - 20, signatureY);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Signature de l\'Agent', 30, signatureY + 5);
      doc.text('Cachet et Signature Direction', pageWidth - 100, signatureY + 5);

      // --- Footer ---
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`GRANITLOGIX S.A.R.L - RAPPORT GÉNÉRÉ LE ${new Date().toLocaleDateString('fr-FR')} - PAGE ${i} SUR ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
      doc.text(`DOCUMENT GÉNÉRÉ ÉLECTRONIQUEMENT LE ${new Date().toLocaleDateString()}`, 10, pageHeight - 10);
      doc.save(`GRANITLOGIX_RAPPORT_${actorName.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Erreur lors de la génération du rapport PDF.');
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Simplified Filters Bar */}
      <div className="bg-white border border-slate-200 p-2 rounded-xl flex flex-col md:flex-row md:items-center gap-3 shadow-sm">
        <div className="flex items-center gap-3 px-3 py-1 flex-1">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
            <Search className="text-slate-500 w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Rechercher..."
            className="flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none border-none p-0 placeholder:text-slate-400"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              type="date"
              className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-[10px] font-semibold text-slate-600 outline-none cursor-pointer"
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
              placeholder="Début"
            />
            <span className="text-slate-400 text-[10px]">à</span>
            <input
              type="date"
              className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-[10px] font-semibold text-slate-600 outline-none cursor-pointer"
              value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
              placeholder="Fin"
            />
          </div>

          {profile?.role === 'admin' && (
            <select
              className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-600 outline-none cursor-pointer"
              value={selectedAgentId}
              onChange={e => setSelectedAgentId(e.target.value)}
            >
              <option value="">Tous les agents</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}

          <select
            className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-600 outline-none cursor-pointer"
            value={filterSand}
            onChange={e => setFilterSand(e.target.value)}
          >
            <option value="">Tous les types</option>
            {uniqueSand.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <select
            className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-600 outline-none cursor-pointer"
            value={filterTruck}
            onChange={e => setFilterTruck(e.target.value)}
          >
            <option value="">Tous les camions</option>
            {uniqueTrucks.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <button
            onClick={generatePDF}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-all shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block premium-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                {profile?.role === 'admin' && <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Responsable</th>}
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Camion</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Client</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Granulométrie</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Volume</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Mt Brut</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right text-rose-500">Autres Frais</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Réel Dir.</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right text-amber-500">Commissions</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Encaissé</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Dette</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((d) => {
                const paid = d.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                const remaining = Math.max(0, d.gross_amount - paid);
                return (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-mono text-[10px] font-bold text-slate-400">{d.delivery_date}</div>
                    </td>
                    {profile?.role === 'admin' && (
                      <td className="px-6 py-4">
                        <div className="font-semibold text-xs text-slate-700">
                          {d.profiles?.first_name}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md">
                        {d.truck_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{d.client}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-semibold text-slate-500">{d.sand_type}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono text-xs font-semibold text-slate-600">{d.volume} <span className="text-[10px] opacity-50">m³</span></div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono text-xs font-semibold text-slate-900">{formatCurrency(d.gross_amount)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono text-xs font-semibold text-rose-600">
                        {formatCurrency(d.other_fees || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono text-xs font-bold text-slate-900 px-2 py-1 rounded-lg">
                        {formatCurrency(d.management_net)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono text-xs font-semibold text-amber-600">
                        {formatCurrency(d.agent_commission)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono text-xs font-semibold text-emerald-600">{formatCurrency(paid)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`font-mono text-xs font-bold ${remaining > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                        {formatCurrency(remaining)}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <button
                          onClick={() => setSelectedDeliveryForPayments(d)}
                          className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl shadow-sm transition-all active:scale-90"
                          title="Paiements"
                        >
                          <Banknote className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(d)}
                          className="p-2.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl shadow-sm transition-all active:scale-90"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(d.id)}
                          className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl shadow-sm transition-all active:scale-90"
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
            <tfoot className="bg-slate-900 text-white">
              <tr className="divide-x divide-slate-800">
                <td colSpan={profile?.role === 'admin' ? 6 : 5} className="px-6 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Totaux consolidés</td>
                <td className="px-6 py-6 text-right font-mono font-black text-lg">{formatCurrency(filteredData.reduce((s, c) => s + c.gross_amount, 0))}</td>
                <td className="px-6 py-6 text-right font-mono font-black text-lg text-rose-500">{formatCurrency(filteredData.reduce((s, c) => s + (c.other_fees || 0), 0))}</td>
                <td className="px-6 py-6 text-right font-mono font-black text-lg text-emerald-400">{formatCurrency(filteredData.reduce((s, c) => s + (c.management_net || 0), 0))}</td>
                <td className="px-6 py-6 text-right font-mono font-black text-lg text-amber-500">{formatCurrency(filteredData.reduce((s, c) => s + (c.agent_commission || 0), 0))}</td>
                <td className="px-6 py-6 text-right font-mono font-black text-lg text-blue-400">
                  {formatCurrency(filteredData.reduce((s, c) => s + (c.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0), 0))}
                </td>
                <td className="px-6 py-6 text-right font-mono font-black text-lg text-rose-400">
                  {formatCurrency(
                    filteredData.reduce((s, c) => s + c.gross_amount, 0) -
                    filteredData.reduce((s, c) => s + (c.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0), 0)
                  )}
                </td>
                <td className="bg-slate-900"></td>
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
                    <span className="block font-bold text-slate-400 uppercase tracking-tighter text-[9px] mb-0.5">Autres Frais</span>
                    <span className="font-mono text-rose-500 font-bold">-{formatCurrency(d.other_fees || 0)}</span>
                  </div>
                  <div className="text-right">
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
