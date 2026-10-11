import { speechSupported } from "../data/speech";

/**
 * The settings values/callbacks `SettingsDialog` can render — shared between it and every
 * ⚙️ button that needs to decide whether it has anything to open (`TopicPicker`,
 * `PracticeNotebook`), via `hasAnySettings` below. Kept in `src/lib/`, not alongside the
 * component, so importing it doesn't pull in JSX (and doesn't break React Fast Refresh,
 * which only works in a file that exports components alone).
 */
export interface SettingsValues {
  readAloud?: boolean;
  onReadAloudChange?: (value: boolean) => void;
  holdZoomLevel?: string;
  onHoldZoomLevelChange?: (levelId: string) => void;
  autoScrollJumpLevel?: string;
  onAutoScrollJumpLevelChange?: (levelId: string) => void;
  panSpeedLevel?: string;
  onPanSpeedLevelChange?: (levelId: string) => void;
  buttonSizeLevel?: string;
  onButtonSizeLevelChange?: (levelId: string) => void;
  suggestionSensitivityLevel?: string;
  onSuggestionSensitivityLevelChange?: (levelId: string) => void;
  navPadVisible?: boolean;
  onNavPadVisibleChange?: (value: boolean) => void;
}

/**
 * Whether there is anything the settings dialog would actually show — the invariant every
 * ⚙️ button on screen relies on before offering itself at all: the dialog must never open
 * empty. Every entry point calls this with the same values it passes to `SettingsDialog`
 * itself, so none of them can ever disagree about whether settings currently exist.
 */
export function hasAnySettings(props: SettingsValues): boolean {
  const showReadAloud = props.readAloud !== undefined && props.onReadAloudChange !== undefined && speechSupported();
  const showHoldZoom = props.holdZoomLevel !== undefined && props.onHoldZoomLevelChange !== undefined;
  const showAutoScrollJump =
    props.autoScrollJumpLevel !== undefined && props.onAutoScrollJumpLevelChange !== undefined;
  const showPanSpeed = props.panSpeedLevel !== undefined && props.onPanSpeedLevelChange !== undefined;
  const showButtonSize = props.buttonSizeLevel !== undefined && props.onButtonSizeLevelChange !== undefined;
  const showSuggestionSensitivity =
    props.suggestionSensitivityLevel !== undefined && props.onSuggestionSensitivityLevelChange !== undefined;
  const showNavPadVisible = props.navPadVisible !== undefined && props.onNavPadVisibleChange !== undefined;
  return (
    showReadAloud ||
    showHoldZoom ||
    showAutoScrollJump ||
    showPanSpeed ||
    showButtonSize ||
    showSuggestionSensitivity ||
    showNavPadVisible
  );
}
