import qrcode from "qrcode-generator";

/** A QR code as inline SVG. The library draws the modules; nothing here is user-controlled
 *  markup (the text is encoded, not rendered). */
export function Qr({ text, label }: { text: string; label: string }) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const svg = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  return <div className="cloud-qr" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
}
