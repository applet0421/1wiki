export function parseYouTubeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (!["youtube.com", "www.youtube.com", "youtu.be"].includes(url.hostname.toLowerCase())) return null;
    const hostname = url.hostname.toLowerCase();
    const id = hostname === "youtu.be"
      ? url.pathname.slice(1)
      : url.pathname.startsWith("/shorts/")
        ? url.pathname.split("/")[2] || ""
        : url.searchParams.get("v") || "";
    return /^[A-Za-z0-9_-]{6,20}$/u.test(id) ? id : null;
  } catch { return null; }
}

export function buildYouTubeEmbed(id: string, title: string): string {
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<iframe class="youtube-embed" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}" title="${escape(title || "YouTube 影片")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
}
