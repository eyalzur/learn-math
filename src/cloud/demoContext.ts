import { createContext, useContext } from "react";
import type { DemoLogins } from "./demoSeed";

/** Present only in the preview: quick sign-ins for the seeded family. Absent in the real apps. */
export const DemoLoginsContext = createContext<DemoLogins | null>(null);
export const useDemoLogins = () => useContext(DemoLoginsContext);
