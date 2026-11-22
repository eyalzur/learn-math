import { speechSupported } from "../data/speech";

/**
 * The settings values/callbacks `SettingsDialog` can render — shared between it and every
 * ⚙️ button that needs to decide whether it has anything to open (`TopicPicker`), via
 * `hasAnySettings` below. Kept in `src/lib/`, not alongside the component, so importing it
 * doesn't pull in JSX (and doesn't break React Fast Refresh, which only works in a file
 * that exports components alone).
 */
export interface SettingsValues {
  readAloud?: boolean;
  onReadAloudChange?: (value: boolean) => void;
  paceLevel?: string;
  onPaceLevelChange?: (levelId: string) => void;
}

/**
 * Whether there is anything the settings dialog would actually show — the invariant every
 * ⚙️ button on screen relies on before offering itself at all: the dialog must never open
 * empty. Every entry point calls this with the same values it passes to `SettingsDialog`
 * itself, so none of them can ever disagree about whether settings currently exist.
 */
export function hasAnySettings(props: SettingsValues): boolean {
  const showReadAloud = props.readAloud !== undefined && props.onReadAloudChange !== undefined && speechSupported();
  const showPaceLevel = props.paceLevel !== undefined && props.onPaceLevelChange !== undefined;
  return showReadAloud || showPaceLevel;
}
