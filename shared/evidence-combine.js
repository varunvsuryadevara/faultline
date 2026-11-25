// Formats and combines manually entered exhibit text with attached evidence files
// for AI cross-examination, preserving source traceability and verbatim quotation.

export function formatAttachmentContent(attachment, exhibitId = 'A', exhibitLabel = '') {
  if (!attachment) return '';
  const name = attachment.name || 'Evidence_File';
  const label = exhibitLabel ? ` (${exhibitLabel})` : '';

  if (attachment.extractedText && attachment.extractedText.trim()) {
    return attachment.extractedText.trim();
  }

  // Fallback if extractedText wasn't pre-generated
  return `[Source: Exhibit ${exhibitId}${label} - ${name}]\n[Attachment: ${name}, Size: ${(attachment.size / 1024).toFixed(1)} KB]`;
}

export function combineExhibitText(manualText = '', attachments = [], exhibitId = 'A', exhibitLabel = '') {
  const cleanManual = typeof manualText === 'string' ? manualText.trim() : '';
  const validAttachments = Array.isArray(attachments)
    ? attachments.filter((a) => a && a.status !== 'error' && (a.extractedText || a.summary))
    : [];

  if (validAttachments.length === 0) {
    return cleanManual;
  }

  const parts = [];
  if (cleanManual) {
    parts.push(cleanManual);
  }

  for (const att of validAttachments) {
    const formatted = formatAttachmentContent(att, exhibitId, exhibitLabel);
    if (formatted) {
      parts.push(formatted);
    }
  }

  return parts.join('\n\n');
}

/**
 * Parses finding / quote text to detect citations to uploaded evidence files
 * (e.g. "Claimant_Statement.pdf, Page 3" or "Repair_Estimate.xlsx, Sheet: Repair Costs, Cell: G18").
 */
export function parseEvidenceCitation(citationText) {
  if (!citationText || typeof citationText !== 'string') return null;

  // 1. Structured tag: [Source: Exhibit A - filename.ext, Page X]
  const sourceMatch = citationText.match(/\[Source:\s*Exhibit\s*([A-P])\s*(?:-\s*([^,\n\]]+))?(?:,\s*Page\s*(\d+))?(?:,\s*Sheet:\s*([^,\n\]]+))?(?:,\s*Cell:\s*([A-Z0-9]+))?(?:,\s*Timestamp:\s*([^,\n\]]+))?\]/i);
  if (sourceMatch) {
    return {
      exhibitId: sourceMatch[1]?.toUpperCase(),
      filename: sourceMatch[2]?.trim(),
      page: sourceMatch[3] ? parseInt(sourceMatch[3], 10) : undefined,
      sheet: sourceMatch[4]?.trim(),
      cell: sourceMatch[5]?.trim(),
      timestamp: sourceMatch[6]?.trim(),
    };
  }

  // 2. Loose file reference: filename.ext ... (Page X / Sheet Y / Cell Z / Timestamp T)
  const fileMatch = citationText.match(/([a-zA-Z0-9_.-]+\.(?:pdf|docx?|xlsx?|csv|png|jpe?g|webp|mp4|mov|mp3|wav|json|eml))\b/i);
  if (fileMatch) {
    const filename = fileMatch[1];
    const rest = citationText.slice(citationText.indexOf(filename) + filename.length);

    const pageMatch = rest.match(/(?:Page|p\.)\s*(\d+)/i);
    const sheetMatch = rest.match(/(?:Sheet|Worksheet)\s*[:=]?\s*([^,\n\);]+)/i);
    const cellMatch = rest.match(/(?:Cell)\s*[:=]?\s*([A-Z0-9]+)/i);
    const timeMatch = rest.match(/(?:Timestamp|time)\s*[:=]?\s*(\d{1,2}:\d{2}(?::\d{2})?)/i);

    return {
      filename,
      page: pageMatch ? parseInt(pageMatch[1], 10) : undefined,
      sheet: sheetMatch ? sheetMatch[1].trim() : undefined,
      cell: cellMatch ? cellMatch[1].trim() : undefined,
      timestamp: timeMatch ? timeMatch[1].trim() : undefined,
    };
  }

  return null;
}
