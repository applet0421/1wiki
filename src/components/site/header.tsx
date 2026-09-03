import Link from "next/link";
export function SiteHeader() {
  return <header className="site-header"><div className="nav-shell"><Link href="/" className="brand-mark">1Wiki</Link><nav aria-label="主要導覽"><Link href="/ai">AI</Link><Link href="/software">軟體</Link><Link href="/social">社群</Link></nav><Link href="/login" className="admin-link">後台</Link></div></header>;
}
