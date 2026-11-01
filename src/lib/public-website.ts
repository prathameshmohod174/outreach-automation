import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 900_000;
const TIMEOUT_MS = 10_000;

function isPublicIPv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a,b] = parts;
  const [c] = parts.slice(2);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 2 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113) ||
    (a === 100 && b >= 64 && b <= 127));
}

function isPublicIPv6(ip: string) {
  const value = ip.toLowerCase().split("%")[0];
  // Only globally routable unicast IPv6 space is allowed.
  return (value.startsWith("2") || value.startsWith("3")) && !value.startsWith("2001:db8:");
}

async function assertPublicHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Private or local website addresses are not allowed.");
  }
  const version = isIP(host);
  if (version === 4) {
    if (!isPublicIPv4(host)) throw new Error("Private or reserved IP addresses are not allowed.");
    return;
  }
  if (version === 6) {
    if (!isPublicIPv6(host)) throw new Error("Private or reserved IP addresses are not allowed.");
    return;
  }
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => entry.family === 4 ? !isPublicIPv4(entry.address) : !isPublicIPv6(entry.address))) {
    throw new Error("The website resolves to a private or reserved network address.");
  }
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function extractPage(html: string) {
  const title = decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/<[^>]+>/g, " ").trim());
  const description = decodeEntities((html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] || "").trim());
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || "";
  const text = decodeEntities(html
    .replace(/<(script|style|noscript|svg|header|footer|nav|form)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
  return { title, description, canonical, text: text.slice(0, 18_000) };
}

export type PublicPage = { url: string; title: string; description: string; text: string };

export async function fetchPublicWebsite(input: string): Promise<PublicPage[]> {
  let current: URL;
  try { current = new URL(input.startsWith("http://") || input.startsWith("https://") ? input : `https://${input}`); }
  catch { throw new Error("Enter a valid website URL."); }
  if (!["http:", "https:"].includes(current.protocol) || current.username || current.password) {
    throw new Error("Only public HTTP or HTTPS websites are supported.");
  }

  const pages: PublicPage[] = [];
  const visited = new Set<string>();
  const candidates: string[] = [current.toString()];

  while (candidates.length && pages.length < 4) {
    const requested = candidates.shift()!;
    if (visited.has(requested)) continue;
    visited.add(requested);
    const url = new URL(requested);
    if (url.origin !== current.origin) continue;
    await assertPublicHost(url.hostname);

    let response: Response | undefined;
    let target = url;
    for (let redirects = 0; redirects <= 3; redirects++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        response = await fetch(target, {
          redirect: "manual",
          signal: controller.signal,
          headers: { "User-Agent": "CreativeOutreachOS/1.0 (public website research)", Accept: "text/html,application/xhtml+xml" }
        });
      } finally { clearTimeout(timer); }
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) break;
        const next = new URL(location, target);
        if (!["http:", "https:"].includes(next.protocol) || next.origin !== current.origin) break;
        await assertPublicHost(next.hostname);
        target = next;
        continue;
      }
      break;
    }
    if (!response || !response.ok) continue;
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) continue;
    const length = Number(response.headers.get("content-length") || 0);
    if (length > MAX_BYTES) continue;
    const reader = response.body?.getReader();
    if (!reader) continue;
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); break; }
      chunks.push(value);
    }
    if (size > MAX_BYTES) continue;
    const html = new TextDecoder().decode(Buffer.concat(chunks));
    const page = extractPage(html);
    if (!page.text && !page.description) continue;
    pages.push({ url: target.toString(), title: page.title, description: page.description, text: page.text });

    if (pages.length === 1) {
      const links = [...html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
      const relevant = links.map((match) => {
        try {
          const link = new URL(match[1], target);
          const label = match[2].replace(/<[^>]+>/g, " ").toLowerCase();
          return { url: link, label, path: link.pathname.toLowerCase() };
        } catch { return null; }
      }).filter((item): item is { url: URL; label: string; path: string } => Boolean(item))
        .filter((item) => item.url.origin === current.origin && /work|project|film|portfolio|about|service|production|contact/.test(item.path + " " + item.label))
        .filter((item) => item.url.pathname !== target.pathname)
        .slice(0, 3);
      for (const item of relevant) candidates.push(item.url.toString());
    }
  }
  if (!pages.length) throw new Error("No readable public HTML pages were found. Check the URL or add research notes manually.");
  return pages;
}
