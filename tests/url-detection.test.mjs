import assert from "node:assert/strict";
import test from "node:test";
import { captureInputFromText, detectLinkSource, findUrl } from "../app/src/flow/urlDetection.ts";

test("detects supported link platforms", () => {
  assert.equal(detectLinkSource("https://www.youtube.com/watch?v=abc")?.sourceType, "youtube");
  assert.equal(detectLinkSource("https://www.bilibili.com/video/BV1")?.siteName, "Bilibili");
  assert.equal(detectLinkSource("https://mp.weixin.qq.com/s/example")?.sourceType, "wechat");
  assert.equal(detectLinkSource("https://www.zhihu.com/question/1")?.siteName, "Zhihu");
});

test("extracts URLs without trailing prose punctuation", () => {
  assert.equal(findUrl("Read https://example.com/article."), "https://example.com/article");
  assert.equal(findUrl("ordinary task"), undefined);
});

test("URL capture keeps the target bucket and extracts link metadata", () => {
  const input = captureInputFromText("A thoughtful video — https://youtu.be/abc", { bucket: "inbox" });
  assert.equal(input.title, "A thoughtful video");
  assert.equal(input.kind, "task");
  assert.equal(input.bucket, "inbox");
  assert.equal(input.siteName, "YouTube");
  assert.equal(input.url, "https://youtu.be/abc");
});

test("plain capture preserves the entry defaults", () => {
  assert.deepEqual(captureInputFromText("Reply to the client", { bucket: "thisWeek" }), {
    bucket: "thisWeek",
    title: "Reply to the client",
  });
});
