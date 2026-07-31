import assert from "node:assert/strict";
import test from "node:test";
import { captureInputFromText, captureReadingFromText, detectLinkSource, findUrl, generateDeepLink } from "../app/src/flow/urlDetection.ts";

test("detects supported link platforms", () => {
  assert.equal(detectLinkSource("https://www.youtube.com/watch?v=abc")?.sourceType, "youtube");
  assert.equal(detectLinkSource("https://www.bilibili.com/video/BV1")?.siteName, "Bilibili");
  assert.equal(detectLinkSource("https://mp.weixin.qq.com/s/example")?.sourceType, "wechat");
  assert.equal(detectLinkSource("https://www.zhihu.com/question/1")?.siteName, "Zhihu");
  assert.equal(detectLinkSource("https://x.com/monthlane/status/123")?.siteName, "X");
  assert.equal(detectLinkSource("https://www.okjike.com/originalPosts/123")?.sourceType, "jike");
  assert.equal(detectLinkSource("https://www.xiaoyuzhoufm.com/episode/123")?.icon, "🎧");
});

test("generates app deep links for supported URL shapes", () => {
  assert.deepEqual(generateDeepLink("https://www.bilibili.com/video/BV123"), {
    platform: "Bilibili",
    icon: "🎬",
    deepLink: "bilibili://video/BV123",
  });
  assert.equal(generateDeepLink("https://youtube.com/watch?v=abc").deepLink, "youtube://watch?v=abc");
  assert.equal(generateDeepLink("https://youtu.be/abc").deepLink, "youtube://watch?v=abc");
  assert.equal(generateDeepLink("https://www.xiaohongshu.com/explore/note1").deepLink, "xhsdiscover://item/note1");
  assert.equal(generateDeepLink("https://www.zhihu.com/question/123").deepLink, "zhihu://question/123");
  assert.equal(generateDeepLink("https://www.xiaoyuzhoufm.com/episode/ep1").deepLink, "xiaoyuzhou://episode/ep1");
  assert.equal(generateDeepLink("https://x.com/person/status/456").deepLink, "twitter://status?id=456");
  assert.equal(generateDeepLink("https://mp.weixin.qq.com/s/article").deepLink, undefined);
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

test("URL capture creates a separate reading item", () => {
  const item = captureReadingFromText("AI Agent future — https://www.bilibili.com/video/BV1");
  assert.deepEqual(item, {
    url: "https://www.bilibili.com/video/BV1",
    title: "AI Agent future",
    platform: "Bilibili",
    platformIcon: "🎬",
    deepLink: "bilibili://video/BV1",
    readStatus: "unread",
  });
});

test("plain capture preserves the entry defaults", () => {
  assert.deepEqual(captureInputFromText("Reply to the client", { bucket: "thisWeek" }), {
    bucket: "thisWeek",
    title: "Reply to the client",
  });
});
