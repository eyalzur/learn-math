import { pricing } from "../data/pricing";
import { Qr } from "./Qr";

/** A short code, and the same thing as a QR for a phone camera. Shown to be read out or scanned
 *  by someone standing next to you. The link always includes the code, so scanning opens the
 *  right app already filled in. */
export function CodeCard({ code, link, qrLabel }: { code: string | null; link: string; qrLabel: string }) {
  return (
    <>
      <div className="cloud-code" aria-label="קוד"><span className="ltr">{code ?? "····"}</span></div>
      {code && <Qr text={link} label={qrLabel} />}
      <p className="cloud-footnote">הקוד תקף {pricing.codeTtlMinutes} דקות.</p>
    </>
  );
}

/** Where each app lives: the kids' app at the site root, the parents' app under /parents/. */
export const appLinks = {
  kids: (code: string) => `${window.location.origin}${import.meta.env.BASE_URL}?code=${code}`,
  parents: (code: string) => `${window.location.origin}${import.meta.env.BASE_URL}parents/?join=${code}`,
};
