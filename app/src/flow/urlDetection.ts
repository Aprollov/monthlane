import type { CreateReadingItemInput, CreateTaskInput } from "../types.ts";

export type LinkSource = {
  url: string;
  sourceType: string;
  siteName: string;
  platform: string;
  icon: string;
  deepLink?: string;
  suggestedTitle: string;
};

type SmartLink = Pick<LinkSource, "platform" | "icon" | "deepLink">;

const platformForHost = (host: string): [string, string, string] => {
  const hostname = host.replace(/^www\./, "").toLowerCase();
  if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) return ["youtube", "YouTube", "▶️"];
  if (hostname.endsWith("bilibili.com") || hostname === "b23.tv") return ["bilibili", "Bilibili", "🎬"];
  if (hostname.endsWith("zhihu.com")) return ["zhihu", "Zhihu", "💡"];
  if (hostname.endsWith("xiaohongshu.com") || hostname === "xhslink.com" || hostname === "xhslink.cn") return ["xiaohongshu", "Xiaohongshu", "🌸"];
  if (hostname.endsWith("douyin.com")) return ["douyin", "Douyin", "🎵"];
  if (hostname.endsWith("weibo.com") || hostname === "t.cn") return ["weibo", "Weibo", "🌊"];
  if (hostname.endsWith("okjike.com")) return ["jike", "Jike", "💬"];
  if (hostname.endsWith("xiaoyuzhoufm.com")) return ["xiaoyuzhou", "Xiaoyuzhou", "🎧"];
  if (hostname === "x.com" || hostname.endsWith("twitter.com")) return ["twitter", "X", "𝕏"];
  if (hostname === "mp.weixin.qq.com") return ["wechat", "WeChat", "💚"];
  return ["web", hostname, "🔗"];
};

const firstPathIdAfter = (parsed: URL, segment: string) => {
  const parts = parsed.pathname.split("/").filter(Boolean);
  const index = parts.indexOf(segment);
  return index >= 0 ? parts[index + 1] : undefined;
};

export const generateDeepLink = (value: string): SmartLink => {
  try {
    const parsed = new URL(value);
    const [sourceType, platform, icon] = platformForHost(parsed.hostname);
    let deepLink: string | undefined;

    if (sourceType === "bilibili") {
      const videoId = firstPathIdAfter(parsed, "video");
      if (videoId) deepLink = `bilibili://video/${encodeURIComponent(videoId)}`;
    } else if (sourceType === "youtube") {
      const videoId = parsed.hostname.replace(/^www\./, "") === "youtu.be"
        ? parsed.pathname.split("/").filter(Boolean)[0]
        : parsed.searchParams.get("v") ?? firstPathIdAfter(parsed, "shorts");
      if (videoId) deepLink = `youtube://watch?v=${encodeURIComponent(videoId)}`;
    } else if (sourceType === "xiaohongshu") {
      const itemId = firstPathIdAfter(parsed, "explore") ?? firstPathIdAfter(parsed, "item");
      if (itemId) deepLink = `xhsdiscover://item/${encodeURIComponent(itemId)}`;
    } else if (sourceType === "zhihu") {
      const questionId = firstPathIdAfter(parsed, "question");
      if (questionId) deepLink = `zhihu://question/${encodeURIComponent(questionId)}`;
    } else if (sourceType === "xiaoyuzhou") {
      const episodeId = firstPathIdAfter(parsed, "episode");
      if (episodeId) deepLink = `xiaoyuzhou://episode/${encodeURIComponent(episodeId)}`;
    } else if (sourceType === "jike") {
      const postId = firstPathIdAfter(parsed, "originalPosts");
      if (postId) deepLink = `jike://page.jk/post-detail/${encodeURIComponent(postId)}`;
    } else if (sourceType === "twitter") {
      const statusId = firstPathIdAfter(parsed, "status");
      if (statusId) deepLink = `twitter://status?id=${encodeURIComponent(statusId)}`;
    }

    return { platform, icon, deepLink };
  } catch {
    return { platform: "Web", icon: "🔗" };
  }
};

export const findUrl = (text: string) => {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return undefined;
  return match[0].replace(/[),.;!?，。；！？]+$/, "");
};

/** Platform share footers like "複製後開啟小紅書查看筆記" or "via @someone". */
const SHARE_SUFFIX_PATTERNS: RegExp[] = [
  /[\s，,、.]*(?:複製|复制|拷貝|拷贝)[\s\S]*$/,
  /[\s，,、.]*(?:打開|打开)\s?(?:App|APP|应用|客户端|小红书|抖音|哔哩哔哩|知乎|微博)?[^。]{0,40}?(?:查看|瀏覽|观看|播放)[\s\S]{0,30}$/,
  /[\s，,、.]*(?:来自|分享自)[^。]{0,40}$/,
  /\bvia\s+@[\w.]+$/i,
];

export const stripShareSuffix = (text: string) => {
  let cleaned = text;
  for (const pattern of SHARE_SUFFIX_PATTERNS) cleaned = cleaned.replace(pattern, "");
  return cleaned.replace(/[…⋯.\s]+$/, "").trim();
};

/** Title = the text around the link, cleaned of the URL and share footers. */
export const titleFromShareText = (text: string, url: string) =>
  stripShareSuffix(text.replace(url, ""))
    .replace(/\s+/g, " ")
    .replace(/^[\s—–:：·|-]+|[\s—–:：·|-]+$/g, "")
    .trim();

export type ClipboardLink = {
  url: string;
  title: string;
  platform: string;
  platformIcon: string;
  deepLink?: string;
  sourceType: string;
  siteName: string;
};

export const analyzeClipboard = (text: string): ClipboardLink | undefined => {
  const found = findUrl(text);
  if (!found) return undefined;
  const source = detectLinkSource(found);
  if (!source) return undefined;
  return {
    url: source.url,
    title: titleFromShareText(text, found),
    platform: source.platform,
    platformIcon: source.icon,
    deepLink: source.deepLink,
    sourceType: source.sourceType,
    siteName: source.siteName,
  };
};

const decodeEntities = (value: string) =>
  value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

/** Best-effort og:title lookup; cross-origin pages simply resolve undefined. */
export const fetchOgTitle = async (url: string, timeoutMs = 4000): Promise<string | undefined> => {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    window.clearTimeout(timer);
    if (!response.ok) return undefined;
    const html = await response.text();
    const match =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const value = match?.[1]?.trim();
    return value ? decodeEntities(value) : undefined;
  } catch {
    return undefined;
  }
};

export const detectLinkSource = (value: string): LinkSource | undefined => {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return undefined;
    const [sourceType, siteName] = platformForHost(parsed.hostname);
    const smartLink = generateDeepLink(parsed.toString());
    return {
      url: parsed.toString(),
      sourceType,
      siteName,
      ...smartLink,
      suggestedTitle: siteName === parsed.hostname.replace(/^www\./, "")
        ? parsed.hostname.replace(/^www\./, "")
        : siteName,
    };
  } catch {
    return undefined;
  }
};

export const captureInputFromText = (
  text: string,
  defaults: Omit<CreateTaskInput, "title">,
): CreateTaskInput => {
  const clean = text.trim();
  const found = findUrl(clean);
  const source = found ? detectLinkSource(found) : undefined;
  if (!source) return { ...defaults, title: clean };
  const suppliedTitle = titleFromShareText(clean, found!);
  const title = suppliedTitle || source.suggestedTitle;
  return {
    ...defaults,
    title,
    pageTitle: suppliedTitle || undefined,
    kind: defaults.kind ?? "task",
    bucket: defaults.bucket ?? "inbox",
    url: source.url,
    sourceType: source.sourceType,
    siteName: source.siteName,
  };
};

export const captureReadingFromText = (text: string): CreateReadingItemInput | undefined => {
  const clean = text.trim();
  const found = findUrl(clean);
  const source = found ? detectLinkSource(found) : undefined;
  if (!source) return undefined;
  const suppliedTitle = titleFromShareText(clean, found!);
  return {
    url: source.url,
    title: suppliedTitle || source.suggestedTitle,
    platform: source.platform,
    platformIcon: source.icon,
    deepLink: source.deepLink,
    readStatus: "unread",
  };
};
