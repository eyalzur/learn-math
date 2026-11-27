import { apiUrl, cloudMode } from "./config";
import { createHttpApi } from "./httpApi";
import { createLocalApi } from "./localApi";
import { currentIdToken, realAuth } from "./parentAuth";
import { getToken } from "./session";
import type { CloudApi } from "./server/types";

/** One `CloudApi` for the page: the real server over HTTP, or (mock mode) the same service
 *  running inside the page. */
export function makeApi(): CloudApi {
  return cloudMode === "mock"
    ? createLocalApi({ parent: () => getToken("parent"), child: () => getToken("child") })
    : createHttpApi(apiUrl, {
        parent: async () => (realAuth ? await currentIdToken() : getToken("parent")),
        child: () => getToken("child"),
      });
}
