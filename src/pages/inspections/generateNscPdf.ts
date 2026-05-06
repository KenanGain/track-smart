// Off-screen render → html2canvas per page → jsPDF compose → download.
// Generic NSC generator covering all four jurisdictions (AB / BC / PE / NS).

import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { NscPdfReport, type NscPdfReportProps } from "./NscPdfReport";

export interface GenerateNscPdfOptions extends NscPdfReportProps {
    fileName?: string;
}

const waitForPaint = () =>
    new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

export async function generateNscPdf(options: GenerateNscPdfOptions): Promise<void> {
    const { fileName, ...reportProps } = options;

    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = [
        "position:fixed",
        "left:-10000px",
        "top:0",
        "width:794px",
        "background:#ffffff",
        "z-index:-1",
        "pointer-events:none",
    ].join(";");
    document.body.appendChild(host);

    let root: Root | null = null;
    try {
        root = createRoot(host);
        root.render(createElement(NscPdfReport, reportProps));

        await waitForPaint();
        await new Promise((r) => setTimeout(r, 350));
        await waitForPaint();
        if ((document as any).fonts?.ready) {
            try { await (document as any).fonts.ready; } catch { /* ignore */ }
        }

        const pages = host.querySelectorAll<HTMLElement>(".pdf-page");
        if (pages.length === 0) throw new Error("No PDF pages rendered.");

        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "pt",
            format: "a4",
            compress: true,
        });
        const pageWpt = pdf.internal.pageSize.getWidth();
        const pageHpt = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < pages.length; i++) {
            const el = pages[i];
            // eslint-disable-next-line no-await-in-loop
            const canvas = await html2canvas(el, {
                scale: 2,
                backgroundColor: "#ffffff",
                useCORS: true,
                logging: false,
                windowWidth: el.offsetWidth,
                windowHeight: el.offsetHeight,
            });
            const img = canvas.toDataURL("image/jpeg", 0.92);
            if (i > 0) pdf.addPage();
            pdf.addImage(img, "JPEG", 0, 0, pageWpt, pageHpt, undefined, "FAST");
        }

        const safeName = (fileName || defaultFileName(reportProps)).replace(/[\\/:*?"<>|]/g, "-");
        pdf.save(safeName);
    } finally {
        try { root?.unmount(); } catch { /* ignore */ }
        try { document.body.removeChild(host); } catch { /* ignore */ }
    }
}

function defaultFileName(props: NscPdfReportProps): string {
    const carrier = (props.carrierProfile.name || "Carrier").replace(/\s+/g, "_");
    const d = (props.reportDate || new Date()).toISOString().slice(0, 10);
    return `NSC-${props.jurisdiction}-Report_${carrier}_${d}.pdf`;
}
