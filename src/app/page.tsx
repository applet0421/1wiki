import { siteConfig } from "@/lib/config/site";

export default function HomePage() {
  return (
    <main className="site-shell">
      <p className="eyebrow">1Wiki</p>
      <h1>{siteConfig.name}</h1>
      <p className="lede">{siteConfig.description}</p>
    </main>
  );
}
