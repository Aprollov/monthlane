import type { CreateTaskInput } from "../types.ts";

export type LinkSource = {
  url: string;
  sourceType: string;
  siteName: string;
  suggestedTitle: string;
};

const platformForHost = (host: string) => {
  const hostname = host.replace(/^www\./, "").toLowerCase();
  if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) return ["youtube", "YouTube"];
  if (hostname.endsWith("bilibili.com") || hostname === "b23.tv") return ["bilibili", "Bilibili"];
  if (hostname.endsWith("zhihu.com")) return ["zhihu", "Zhihu"];
  if (hostname.endsWith("xiaohongshu.com") || hostname === "xhslink.com") return ["xiaohongshu", "Xiaohongshu"];
  if (hostname.endsWith("okjike.com")) return ["jike", "Jike"];
  if (hostname.endsWith("xiaoyuzhoufm.com")) return ["xiaoyuzhou", "Xiaoyuzhou"];
  if (hostname === "mp.weixin.qq.com") return ["wechat", "WeChat"];
  return ["web", hostname];
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
    return {
      url: parsed.toString(),
      sourceType,
      siteName,
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
    kind: "readLater",
    bucket: "laterRead",
    url: source.url,
    sourceType: source.sourceType,
    siteName: source.siteName,
  };
};
