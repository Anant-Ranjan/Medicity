"use client";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateAnalyticsReport(
  metrics: any,
  diseaseStats: any[],
  hospitalStats: any[],
  outbreaks: any[]
) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210; const margin = 15;
  let y = margin;

  const addText = (text: string, size = 10, bold = false, color: [number,number,number] = [15,23,42]) => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setTextColor(...color);
    pdf.text(text, margin, y);
    y += size * 0.45;
  };
  const nl = (n = 6) => { y += n; };
  const line = () => { pdf.setDrawColor(71,85,105); pdf.line(margin, y, W - margin, y); nl(4); };

  // ── Cover Page ────────────────────────────────────────────────────────────
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, W, 297, 'F');

  pdf.setFillColor(99, 102, 241);
  pdf.rect(0, 0, W, 60, 'F');

  pdf.setFontSize(28); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('MediCity', margin, 28);
  pdf.setFontSize(13); pdf.setFont('helvetica', 'normal');
  pdf.text('Public Health Intelligence Report', margin, 40);
  pdf.setFontSize(9); pdf.setTextColor(148, 163, 184);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, 52);

  // KPIs
  y = 75;
  const kpis = [
    ['Hospitals', metrics.totalHospitals.toString()],
    ['Total Cases', metrics.totalReportedCases.toString()],
    ['Global ICU Load', `${metrics.globalICURatio.toFixed(1)}%`],
    ['Disease Clusters', diseaseStats.length.toString()],
  ];
  kpis.forEach(([label, val], i) => {
    const bx = margin + i * 45; const by = y;
    pdf.setFillColor(30, 41, 59);
    pdf.roundedRect(bx, by, 42, 22, 3, 3, 'F');
    pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(99, 102, 241);
    pdf.text(val, bx + 21, by + 12, { align: 'center' });
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(148, 163, 184);
    pdf.text(label, bx + 21, by + 19, { align: 'center' });
  });

  // ── Page 2 — Disease Summary ──────────────────────────────────────────────
  pdf.addPage();
  pdf.setFillColor(15, 23, 42); pdf.rect(0, 0, W, 297, 'F');
  y = margin;

  pdf.setFontSize(16); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(99, 102, 241);
  pdf.text('Disease Breakdown', margin, y); y += 8;
  pdf.setDrawColor(99, 102, 241); pdf.setLineWidth(0.5); pdf.line(margin, y, margin + 60, y); y += 8;

  diseaseStats.forEach((d, i) => {
    if (y > 260) { pdf.addPage(); pdf.setFillColor(15,23,42); pdf.rect(0,0,W,297,'F'); y = margin; }

    pdf.setFillColor(30, 41, 59);
    pdf.roundedRect(margin, y, W - margin * 2, 32, 3, 3, 'F');

    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(226, 232, 240);
    pdf.text(`${i + 1}. ${d.name}`, margin + 4, y + 8);

    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(148, 163, 184);
    pdf.text(`Category: ${d.category}`, margin + 4, y + 15);
    pdf.text(`Hospitals: ${d.hospitals.join(', ').slice(0, 60)}`, margin + 4, y + 21);

    // Mini severity bar
    const barW = 80; const bx = W - margin - barW - 4;
    const sevTotal = Math.max(1, d.severity.mild + d.severity.moderate + d.severity.severe + d.severity.critical);
    const colors: [number,number,number][] = [[34,197,94],[234,179,8],[245,158,11],[239,68,68]];
    const vals = [d.severity.mild, d.severity.moderate, d.severity.severe, d.severity.critical];
    let sx = bx;
    pdf.setFontSize(6); pdf.setTextColor(148,163,184);
    pdf.text('Severity:', bx, y + 10);
    vals.forEach((v, ci) => {
      const w = (v / sevTotal) * barW;
      pdf.setFillColor(...colors[ci]);
      pdf.rect(sx, y + 13, w, 4, 'F');
      sx += w;
    });

    // Total cases
    pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(239, 68, 68);
    pdf.text(d.totalCases.toString(), W - margin - 4, y + 12, { align: 'right' });
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(148,163,184);
    pdf.text('cases', W - margin - 4, y + 19, { align: 'right' });

    y += 37;
  });

  // ── Page 3 — Hospital Burden ──────────────────────────────────────────────
  pdf.addPage();
  pdf.setFillColor(15, 23, 42); pdf.rect(0, 0, W, 297, 'F');
  y = margin;

  pdf.setFontSize(16); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(99, 102, 241);
  pdf.text('Hospital Case Burden Ranking', margin, y); y += 8;
  pdf.setDrawColor(99,102,241); pdf.setLineWidth(0.5); pdf.line(margin, y, margin+80, y); y += 8;

  const maxH = hospitalStats[0]?.totalCases || 1;
  hospitalStats.forEach((h, i) => {
    if (y > 260) { pdf.addPage(); pdf.setFillColor(15,23,42); pdf.rect(0,0,W,297,'F'); y = margin; }
    const barW = (h.totalCases / maxH) * 100;

    pdf.setFillColor(30,41,59); pdf.roundedRect(margin, y, W - margin*2, 18, 2, 2, 'F');
    pdf.setFontSize(9); pdf.setFont('helvetica','bold'); pdf.setTextColor(226,232,240);
    pdf.text(`#${i+1} ${h.tenantName}`, margin + 4, y + 7);
    pdf.setFillColor(99,102,241); pdf.rect(margin + 4, y + 10, barW, 4, 'F');
    pdf.setFontSize(8); pdf.setFont('helvetica','normal'); pdf.setTextColor(239,68,68);
    pdf.text(`${h.totalCases} cases`, W - margin - 4, y + 10, { align: 'right' });
    y += 23;
  });

  // ── ICU Sectors ───────────────────────────────────────────────────────────
  y += 6;
  pdf.setFontSize(16); pdf.setFont('helvetica','bold'); pdf.setTextColor(99,102,241);
  if (y > 230) { pdf.addPage(); pdf.setFillColor(15,23,42); pdf.rect(0,0,W,297,'F'); y = margin; }
  pdf.text('Regional ICU Capacity', margin, y); y += 8;
  pdf.setDrawColor(99,102,241); pdf.line(margin, y, margin+70, y); y += 8;

  metrics.sectors.forEach((sec: any) => {
    pdf.setFillColor(30,41,59); pdf.roundedRect(margin, y, W-margin*2, 16, 2, 2, 'F');
    const cap = sec.cap;
    const barColor: [number,number,number] = cap > 90 ? [239,68,68] : cap > 70 ? [245,158,11] : [34,197,94];
    pdf.setFontSize(9); pdf.setFont('helvetica','bold'); pdf.setTextColor(226,232,240);
    pdf.text(sec.name, margin+4, y+8);
    pdf.setFillColor(...barColor); pdf.rect(margin+60, y+4, cap * 0.9, 8, 'F');
    pdf.setFontSize(9); pdf.setTextColor(...barColor);
    pdf.text(`${cap}%`, W-margin-4, y+10, { align: 'right' });
    y += 21;
  });

  // Footer on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFillColor(30,41,59); pdf.rect(0, 287, W, 10, 'F');
    pdf.setFontSize(7); pdf.setTextColor(100,116,139);
    pdf.text('MediCity Healthcare Intelligence Platform — Confidential', margin, 293);
    pdf.text(`Page ${p} of ${totalPages}`, W - margin, 293, { align: 'right' });
  }

  pdf.save(`MediCity_Report_${new Date().toISOString().slice(0,10)}.pdf`);
}
