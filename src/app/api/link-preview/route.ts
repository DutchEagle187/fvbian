import { NextResponse } from "next/server";

import { auth } from "@/auth";

export const runtime = "nodejs";

interface Preview {
  url: string;
  title: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

/** Extract the content of the first matching <meta> tag. */
function metaContent(html: string, keys: string[]): string | undefined {
  const tags = html.match(/<meta[^>]+>/gi) ?? [];
  for (const tag of tags) {
    const key =
      tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (key && keys.includes(key)) {
      const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
      if (content) return decode(content.trim());
    }
  }
  return undefined;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function isPrivateHost(host: string): boolean {
  return (
    host === "localhost" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "::1" ||
    host === "[::1]"
  );
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  if (
    !["http:", "https:"].includes(target.protocol) ||
    isPrivateHost(target.hostname)
  ) {
    return NextResponse.json({ error: "blocked url" }, { status: 400 });
  }

  const fallback: Preview = {
    url: target.toString(),
    title: target.hostname.replace(/^www\./, ""),
    favicon: `https://www.google.com/s2/favicons?sz=64&domain=${target.hostname}`,
  };

  try {
    const res = await fetch(target, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; fvbianBot/1.0; +https://fvbian.com)",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });

    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.includes("text/html")) {
      return NextResponse.json(fallback);
    }

    // Only read the first ~150KB — the <head> is all we need.
    const html = (await res.text()).slice(0, 150_000);

    const title =
      metaContent(html, ["og:title", "twitter:title"]) ??
      decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "") ??
      fallback.title;

    const preview: Preview = {
      url: target.toString(),
      title: title || fallback.title,
      description: metaContent(html, [
        "og:description",
        "twitter:description",
        "description",
      ]),
      image: metaContent(html, ["og:image", "og:image:url", "twitter:image"]),
      siteName: metaContent(html, ["og:site_name"]),
      favicon: fallback.favicon,
    };

    return NextResponse.json(preview);
  } catch {
    return NextResponse.json(fallback);
  }
}
