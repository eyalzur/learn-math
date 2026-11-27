import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/** "Put it on your home screen" — each app installs by itself (own name and icon), so each
 *  landing page offers it. Android/Chrome gets a real install button; iPhone can only be told
 *  how (Share → Add to Home Screen); an already-installed app shows nothing. */
export function InstallHint({ appName }: { appName: string }) {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);

  if (standalone) return null;
  if (event) {
    return (
      <button className="cloud-btn" onClick={() => void event.prompt()}>
        להתקין את {appName}
      </button>
    );
  }
  if (ios) {
    return (
      <p className="cloud-footnote">
        להתקנה במסך הבית: לחצו על שיתוף <span aria-hidden="true">⬆️</span> ואז ״הוספה למסך הבית״.
      </p>
    );
  }
  return null;
}
