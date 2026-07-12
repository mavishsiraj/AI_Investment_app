"use client";

import { useState, type RefObject } from "react";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ExportButtonProps {
  reportRef: RefObject<HTMLElement>;
}

export function ExportButton({ reportRef }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    const element = reportRef.current;
    if (!element) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#06080e" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const width = imgWidth * ratio;
      const height = imgHeight * ratio;
      pdf.addImage(imgData, "PNG", (pdfWidth - width) / 2, 10, width, height);
      pdf.save(`${element.dataset.reportTitle ?? "investment-report"}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-amber-300 transition hover:bg-amber-500/20"
    >
      <Download className="h-4 w-4" />
      {isExporting ? "Generating…" : "Export PDF"}
    </button>
  );
}
