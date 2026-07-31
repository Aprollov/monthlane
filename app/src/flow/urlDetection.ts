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
  if (hostname.endsWith("xiaohongshu.com") || hostname === "xhslink.com") return ["xiaohongshu", "Xiaohongshu", "🌸"];
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
  const suppliedTitle = clean.replace(found!, "").replace(/^[\s—–:：|-]+|[\s—–:：|-]+$/g, "").trim();
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
  const suppliedTitle = clean.replace(found!, "").replace(/^[\s—–:：|-]+|[\s—–:：|-]+$/g, "").trim();
  return {
    url: source.url,
    title: suppliedTitle || source.suggestedTitle,
    platform: source.platform,
    platformIcon: source.icon,
    deepLink: source.deepLink,
    readStatus: "unread",
  };
};
