import Link from "next/link";
export function SiteFooter() {
  return <footer className="site-footer"><div className="footer-shell"><div><strong>1Wiki</strong><p>AI、軟體、3C 使用教學與疑難解答。</p></div><nav aria-label="網站資訊"><Link href="/about">關於我們</Link><Link href="/contact">聯絡我們</Link><Link href="/privacy">隱私權</Link><Link href="/terms">使用條款</Link></nav><small>© {new Date().getFullYear()} 1Wiki</small></div></footer>;
}
