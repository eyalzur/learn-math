import "./profile.css";
import { forwardRef } from "react";
import type { Avatar } from "../data/avatars";

interface ProfileChipProps {
  avatar: Avatar;
  onClick: () => void;
}

/** The small avatar button in a screen's header corner — opens the profile drawer. */
export const ProfileChip = forwardRef<HTMLButtonElement, ProfileChipProps>(function ProfileChip(
  { avatar, onClick },
  ref,
) {
  return (
    <button ref={ref} type="button" className="profile-chip" aria-label="הפרופיל שלי" onClick={onClick}>
      <span aria-hidden="true">{avatar.emoji}</span>
    </button>
  );
});
