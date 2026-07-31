import { generateDeepLink } from "./urlDetection.ts";

export const isMobileDevice = (
  userAgent = globalThis.navigator?.userAgent ?? "",
  maxTouchPoints = globalThis.navigator?.maxTouchPoints ?? 0,
) => /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) ||
  (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);

export const openSmartLink = (
  item: { url?: string; deepLink?: string },
  environment: Pick<Window, "location" | "open" | "setTimeout"> = window,
) => {
  if (!item.url) return;
  const deepLink = item.deepLink ?? generateDeepLink(item.url).deepLink;
  if (!deepLink || !isMobileDevice()) {
    environment.open(item.url, "_blank", "noopener,noreferrer");
    return;
  }

  let leftPage = false;
  const onVisibilityChange = () => {
    if (document.hidden) leftPage = true;
  };
  document.addEventListener("visibilitychange", onVisibilityChange, { once: true });
  try {
    environment.location.href = deepLink;
  } catch {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    environment.open(item.url, "_blank", "noopener,noreferrer");
    return;
  }
  environment.setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (!leftPage && !document.hidden) environment.location.href = item.url!;
  }, 1500);
};
