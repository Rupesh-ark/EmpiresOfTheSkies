import JSZip from "jszip";
import { saveAs } from "file-saver";

/** Convert an SVG element to a PNG blob at 2x resolution for crisp output. */
function svgToPng(svg: SVGSVGElement, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { width, height } = svg.getBoundingClientRect();
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));

    const xml = new XMLSerializer().serializeToString(clone);
    const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      }, "image/png");
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Export all charts within a container as a zip of PNGs.
 * Charts are identified by their closest ancestor with a `data-chart-name` attribute.
 */
export async function exportChartsAsZip(
  container: HTMLElement,
  zipName: string,
): Promise<void> {
  const zip = new JSZip();
  const panels = container.querySelectorAll<HTMLElement>("[data-chart-name]");
  const seen = new Set<string>();

  for (const panel of panels) {
    const svg = panel.querySelector("svg");
    if (!svg) continue;

    let name = panel.dataset.chartName ?? "chart";
    if (seen.has(name)) {
      let i = 2;
      while (seen.has(`${name}_${i}`)) i++;
      name = `${name}_${i}`;
    }
    seen.add(name);

    const blob = await svgToPng(svg);
    zip.file(`${name}.png`, blob);
  }

  if (seen.size === 0) return;

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${zipName}.zip`);
}
