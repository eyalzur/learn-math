import { CHANGELOG } from "../data/changelog";
import { APP_VERSION } from "../data/version";

export interface VersionLogProps {
  open: boolean;
  onClose: () => void;
}

export function VersionLog({ open, onClose }: VersionLogProps) {
  if (!open) return null;

  return (
    <div className="version-log-backdrop" onClick={onClose}>
      <div
        className="version-log-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-log-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="version-log-title" id="version-log-title">
          מה היה בכל גרסה
        </h2>

        <ul className="version-log-list">
          {CHANGELOG.map((entry) => (
            <li key={entry.version} className="version-log-entry">
              <p className="version-log-heading">
                <span className="version-log-version">{entry.version}</span>
                {entry.version === APP_VERSION && (
                  <span className="version-log-today">(היום)</span>
                )}
              </p>
              <p className="version-log-description">{entry.description}</p>
            </li>
          ))}
        </ul>

        <div className="settings-actions">
          <button type="button" className="secondary" onClick={onClose}>
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}
