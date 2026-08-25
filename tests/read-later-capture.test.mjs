import assert from "node:assert/strict";
import test from "node:test";

import { analyzeClipboard, findUrl, stripShareSuffix } from "../app/src/flow/urlDetection.ts";

const XHS_SHARE = "真正的机会藏在风口之外 最近好多做传统消费品营销的... http://xhslink.cn/o/AghJpgXB9nM 複製後開啟小紅書查看筆記";

test("extracts the first URL from shared clipboard text", () => {
  assert.equal(findUrl(XHS_SHARE), "http://xhslink.cn/o/AghJpgXB9nM");
});

test("analyzes a Xiaohongshu share into a Read Later payload", () => {
  const link = analyzeClipboard(XHS_SHARE);
  assert.ok(link);
  assert.equal(link.url, "http://xhslink.cn/o/AghJpgXB9nM");
  assert.equal(link.platform, "Xiaohongshu");
  assert.equal(link.sourceType, "xiaohongshu");
  assert.equal(link.title, "真正的机会藏在风口之外 最近好多做传统消费品营销的");
});

test("strips platform share footers", () => {
  assert.equal(stripShareSuffix("好文章 複製此連結打開App查看"), "好文章");
  assert.equal(stripShareSuffix("来自知乎客户端"), "");
  assert.equal(stripShareSuffix("check this out via @someone"), "check this out");
});

test("detects bilibili and zhihu platforms", () => {
  assert.equal(analyzeClipboard("https://www.bilibili.com/video/BV123 打开哔哩哔哩查看")?.platform, "Bilibili");
  assert.equal(analyzeClipboard("https://www.zhihu.com/question/123")?.platform, "Zhihu");
});

test("returns undefined when clipboard has no link", () => {
  assert.equal(analyzeClipboard("买牛奶"), undefined);
});
