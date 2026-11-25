import { jsPDF } from 'jspdf';
import { COUNTRY_METADATA, REGULATION_CATEGORIES, VERIFICATION_STATUSES } from '../../shared/regulations/vocab.js';
import { REGULATIONS, OFFICIAL_DOCUMENTS } from '../../shared/regulations/data.js';

/**
 * Generates a comprehensive, publication-quality Country Motor Insurance
 * Laws, Regulations, Claims Procedures & Legal Reference Guide as a PDF.
 *
 * @param {string} countryCode 2-letter country code (e.g. 'UK', 'IN', 'US')
 * @returns {{ blob: Blob, filename: string, title: string }}
 */
export function generateCountryGuidePdf(countryCode) {
  const cc = String(countryCode || 'UK').toUpperCase();
  const meta = COUNTRY_METADATA[cc] || {
    flag: '🌐',
    code: cc,
    name: cc,
    legalSystem: 'Statutory Jurisprudence',
    regulator: 'Insurance Regulatory Authority',
  };

  const regs = REGULATIONS.filter((r) => r.country === cc);
  const docs = OFFICIAL_DOCUMENTS.filter((d) => d.country === cc);

  const year = new Date().getFullYear();
  const filename = `FaultLine_Motor_Insurance_Guide_${cc}_${year}.pdf`;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 42;
  const contentWidth = pageWidth - marginX * 2;
  const marginTop = 50;
  const marginBottom = 50;
  let y = marginTop;

  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
      renderRunningHeader();
    }
  };

  const renderRunningHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`FAULTLINE LEGAL REFERENCE GUIDE — ${meta.name.toUpperCase()}`, marginX, 32);
    doc.setFont('helvetica', 'normal');
    doc.text(`Edition ${year}`, pageWidth - marginX, 32, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.line(marginX, 38, pageWidth - marginX, 38);
  };

  // -------------------------------------------------------------------------
  // 1. COVER PAGE / HEADER
  // -------------------------------------------------------------------------
  renderRunningHeader();

  // Primary Title Box
  doc.setFillColor(15, 23, 42); // Dark slate banner
  doc.roundedRect(marginX, y, contentWidth, 120, 6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(96, 165, 250); // Light blue
  doc.text('STATUTORY CLAIMS & INVESTIGATION HANDBOOK', marginX + 16, y + 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(`${meta.name} Motor Insurance Legal Guide`, marginX + 16, y + 54);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Statutory Frameworks, Claims Adjudication, Evidence Rules & Penal Provisions (${meta.legalSystem})`,
    marginX + 16,
    y + 74
  );

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Supervisory Body: ${meta.regulator}  |  Jurisdiction Code: ${meta.code}  |  Compiled: Q1 ${year}`,
    marginX + 16,
    y + 100
  );

  y += 136;

  // Metadata Grid Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, y, contentWidth, 54, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PRIMARY REGULATOR', marginX + 12, y + 16);
  doc.text('LEGAL SYSTEM', marginX + 200, y + 16);
  doc.text('VERIFICATION STATUS', marginX + 370, y + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);

  // Truncate regulator if too wide
  const regLines = doc.splitTextToSize(meta.regulator, 175);
  doc.text(regLines[0], marginX + 12, y + 34);

  const sysLines = doc.splitTextToSize(meta.legalSystem, 160);
  doc.text(sysLines[0], marginX + 200, y + 34);

  const vStatus = regs.length > 0 ? (regs.some((r) => r.status === 'VERIFIED') ? 'VERIFIED' : 'PARTIALLY_VERIFIED') : 'PENDING';
  doc.setTextColor(vStatus === 'VERIFIED' ? 22 : 14, vStatus === 'VERIFIED' ? 163 : 165, vStatus === 'VERIFIED' ? 74 : 233);
  doc.text(vStatus === 'VERIFIED' ? 'Verified Official Source' : 'Partially Verified', marginX + 370, y + 34);

  y += 70;

  // Executive Introduction
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Executive Overview & Scope', marginX, y);
  y += 14;

  const introText =
    `This guide provides insurance claims investigators, forensic examiners, and claims handlers with an authoritative summary of the statutory and regulatory framework governing motor vehicle insurance claims in ${meta.name}. It details compulsory insurance coverage thresholds, statutory accident reporting deadlines, comparative liability rules, bodily injury tariffs, total-loss salvage rules, criminal fraud statutes, and ombudsman complaint procedures.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const introLines = doc.splitTextToSize(introText, contentWidth);
  doc.text(introLines, marginX, y);
  y += introLines.length * 13 + 16;

  // -------------------------------------------------------------------------
  // 2. 10 CATEGORIES WALKTHROUGH
  // -------------------------------------------------------------------------
  REGULATION_CATEGORIES.forEach((cat, idx) => {
    const matchingRegs = regs.filter((r) => r.categoryId === cat.id);

    checkPageBreak(90);

    // Section Category Banner
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(marginX, y, contentWidth, 22, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}. ${cat.label.toUpperCase()}`, marginX + 8, y + 15);

    y += 30;

    if (matchingRegs.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `General statutory standards apply under ${meta.name} jurisprudence. Detailed regulatory codification is pending full statutory indexing.`,
        marginX + 8,
        y
      );
      y += 20;
      return;
    }

    matchingRegs.forEach((reg) => {
      checkPageBreak(130);

      // Regulation Title & Citation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235); // Blue
      doc.text(reg.title, marginX + 8, y);
      y += 14;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Legal Citation: ${reg.legalReference}   |   Authority: ${reg.authority}`, marginX + 8, y);
      y += 14;

      // Summary
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const sumLines = doc.splitTextToSize(reg.summary, contentWidth - 16);
      doc.text(sumLines, marginX + 8, y);
      y += sumLines.length * 12.5 + 8;

      // Detailed Explanation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('STATUTORY PROVISIONS & MECHANISM:', marginX + 8, y);
      y += 11;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const detailLines = doc.splitTextToSize(reg.detailedExplanation, contentWidth - 16);
      doc.text(detailLines, marginX + 8, y);
      y += detailLines.length * 12 + 10;

      // Claims Implications
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('CLAIMS ADJUSTMENT IMPLICATIONS:', marginX + 8, y);
      y += 11;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const claimLines = doc.splitTextToSize(reg.claimsImplications, contentWidth - 16);
      doc.text(claimLines, marginX + 8, y);
      y += claimLines.length * 12 + 10;

      // Investigation Implications
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('INVESTIGATIVE AUDIT CHECKLIST:', marginX + 8, y);
      y += 11;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const invLines = doc.splitTextToSize(reg.investigationImplications, contentWidth - 16);
      doc.text(invLines, marginX + 8, y);
      y += invLines.length * 12 + 14;

      // Source URL if present
      if (reg.sourceUrl) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(37, 99, 235);
        doc.text(`Official Source: ${reg.sourceUrl}`, marginX + 8, y);
        y += 14;
      }

      y += 6;
    });
  });

  // -------------------------------------------------------------------------
  // 3. OFFICIAL DOCUMENTS & REPOSITORY
  // -------------------------------------------------------------------------
  if (docs.length > 0) {
    checkPageBreak(120);

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(marginX, y, contentWidth, 22, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('APPENDIX: OFFICIAL STATUTORY ACTS & REPOSITORIES', marginX + 8, y + 15);

    y += 32;

    docs.forEach((docItem, idx) => {
      checkPageBreak(50);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. ${docItem.title}`, marginX + 8, y);
      y += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`${docItem.category} | ${docItem.authority} (${docItem.year})`, marginX + 8, y);
      y += 11;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text(docItem.officialUrl, marginX + 8, y);
      y += 16;
    });
  }

  // -------------------------------------------------------------------------
  // 4. STATUTORY DISCLAIMER
  // -------------------------------------------------------------------------
  checkPageBreak(70);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.75);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('LEGAL & REGULATORY NOTICE:', marginX, y);
  y += 11;

  const disclaimer =
    'This regulatory handbook is compiled for insurance claims investigation, academic, and forensic training purposes within the FaultLine Intelligence Platform. Statutory citations reflect prevailing legislative acts and court interpretations as of the publication date. This guide does not constitute formal legal counsel; handlers must consult qualified regional legal practitioners on specific contentious claims.';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const disLines = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(disLines, marginX, y);

  // -------------------------------------------------------------------------
  // 5. PAGE NUMBER FOOTER
  // -------------------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`FaultLine Intelligence Platform  |  ${meta.name} Motor Insurance Guide`, marginX, pageHeight - 24);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 24, { align: 'right' });
  }

  const blob = doc.output('blob');
  return { blob, filename, title: `${meta.name} Motor Insurance Guide` };
}

/**
 * Convenience helper to trigger browser download of the Country Guide PDF.
 */
export function downloadCountryGuidePdf(countryCode) {
  const { blob, filename } = generateCountryGuidePdf(countryCode);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
