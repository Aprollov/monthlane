import assert from "node:assert/strict";
import test from "node:test";

import { isMobileDevice } from "../app/src/flow/smartLinks.ts";

test("mobile detection supports phones, tablets, and iPad desktop mode", () => {
  assert.equal(isMobileDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", 5), true);
  assert.equal(isMobileDevice("Mozilla/5.0 (Linux; Android 15; Pixel)", 5), true);
  assert.equal(isMobileDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", 5), true);
  assert.equal(isMobileDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", 0), false);
  assert.equal(isMobileDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 0), false);
});
