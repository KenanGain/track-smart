// Off-screen render → html2canvas per page → jsPDF compose → download.
//
// We deliberately use html2canvas (rasterise) rather than jsPDF.html() so
// the recharts SVG charts come through as crisp images at the configured
// pixel ratio. Each <Page> in FmcsaPdfReport is captured separately and
// added as its own A4 page so internal page breaks are clean — no risk of
// half a chart bleeding across two pages.

import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { FmcsaPdfReport, type FmcsaPdfReportProps } from "./FmcsaPdfReport";

export interface GenerateFmcsaPdfOptions extends FmcsaPdfReportProps {
    fileName?: string;
}

/** Wait for fonts and chart layout to settle. Recharts needs a couple of
 *  animation frames to compute SVG dimensions after first mount. */
const waitForPaint = () =>
    new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

export async function generateFmcsaPdf(options: GenerateFmcsaPdfOptions): Promise<void> {
    const { fileName, ...reportProps } = options;

    // Off-screen mount point — far left, above the page so it's never visible
    // but still has real layout (display:none breaks chart sizing).
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
        root.render(createElement(FmcsaPdfReport, reportProps));

        // Two paint cycles + 250ms for recharts initial animation completion.
        await waitForPaint();
        await new Promise((r) => setTimeout(r, 350));
        await waitForPaint();
        // Wait for fonts to fully load (system fallback fine if .ready missing).
        if ((document as any).fonts?.ready) {
            try { await (document as any).fonts.ready; } catch { /* ignore */ }
        }

        const pages = host.querySelectorAll<HTMLElement>(".pdf-page");
        if (pages.length === 0) throw new Error("No PDF pages rendered.");

        // A4 portrait points: 595 × 842
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
            // Capture at 2× scale for crispness.
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
        // Tear down React root + host.
        try { root?.unmount(); } catch { /* ignore */ }
        try { document.body.removeChild(host); } catch { /* ignore */ }
    }
}

function defaultFileName(props: FmcsaPdfReportProps): string {
    const carrier = (props.carrierProfile.name || "Carrier").replace(/\s+/g, "_");
    const dot = props.carrierProfile.id ?? "";
    const d = (props.reportDate || new Date()).toISOString().slice(0, 10);
    return `FMCSA-Report_${carrier}${dot ? "_DOT" + dot : ""}_${d}.pdf`;
}
