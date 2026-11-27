import { pricing } from "../data/pricing";
import { Qr } from "./Qr";

/** A short code, and the same thing as a QR for a phone camera. Shown to be read out or scanned
 *  by someone standing next to you. The link always includes the code, so scanning opens the
 *  right app already filled in. */
export function CodeCard({ code, link, qrLabel, shareText }: { code: string | null; link: string; qrLabel: string; shareText?: string }) {
  return (
    <>
      <div className="cloud-code" aria-label="קוד"><span className="ltr">{code ?? "····"}</span></div>
      {code && <Qr text={link} label={qrLabel} />}
      {code && shareText && <WhatsAppButton text={shareText} />}
      <p className="cloud-footnote">הקוד תקף {pricing.codeTtlMinutes} דקות.</p>
    </>
  );
}

/** Opens WhatsApp with the invitation ready to send: on a phone it offers the contact list, on a
 *  computer it opens WhatsApp Web. No number is needed — the sender chooses who. */
export function WhatsAppButton({ text }: { text: string }) {
  return (
    <a
      className="cloud-btn whatsapp"
      href={`https://wa.me/?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="wa-icon" aria-hidden="true">💬</span>
      שליחה בוואטסאפ
    </a>
  );
}

/** What the message says. The link carries the code, so one tap opens the right app already filled in. */
export const inviteText = {
  child: (code: string, link: string) => `הצטרפו אליי ללומדים חשבון 🧮\nהקוד שלי: ${code}\n${link}\n(הקוד תקף ${pricing.codeTtlMinutes} דקות)`,
  device: (name: string, code: string, link: string) => `החלפת מכשיר ללומדים חשבון 🧮 (${name})\nהקוד: ${code}\n${link}\n(הקוד תקף ${pricing.codeTtlMinutes} דקות)`,
  parent: (code: string, link: string) => `הוזמנת לאפליקציית ההורים של לומדים חשבון 👪\nקוד הצטרפות: ${code}\n${link}\n(הקוד תקף ${pricing.codeTtlMinutes} דקות)`,
};

/** Where each app lives: the kids' app at the site root, the parents' app under /parents/. */
export const appLinks = {
  kidsDevice: (code: string) => `${window.location.origin}${import.meta.env.BASE_URL}?device=${code}`,
  kids: (code: string) => `${window.location.origin}${import.meta.env.BASE_URL}?code=${code}`,
  parents: (code: string) => `${window.location.origin}${import.meta.env.BASE_URL}parents/?join=${code}`,
};
