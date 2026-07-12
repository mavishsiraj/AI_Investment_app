"use client";

import { useState, type RefObject } from "react";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";

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
      // Matches --page from globals.css — html2canvas can't read CSS
      // custom properties, so the background is passed explicitly.
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#07090d" });
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
    <Button type="button" variant="secondary" size="sm" onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {isExporting ? "Generating…" : "Export PDF"}
    </Button>
  );
}
