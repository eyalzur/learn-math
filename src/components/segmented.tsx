import { promptSegments } from "../data/curriculum";

/** Hebrew wrapped around an arithmetic run, split so the run can be isolated. Shared by
 *  every screen that renders question text with backtick-marked numbers inside it —
 *  Practice.tsx and the lesson screen both call this one, not a copy each. Kept in its
 *  own file, not alongside a component: mixing a component export with a plain function
 *  export in one file disables fast refresh for that file. */
export function segmented(text: string) {
  return promptSegments(text).map((segment, i) =>
    segment.kind === "math" ? (
      <span key={i} className="prompt-math">
        {segment.value}
      </span>
    ) : (
      <span key={i}>{segment.value}</span>
    ),
  );
}
