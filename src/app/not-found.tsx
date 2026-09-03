import Link from "next/link";
export default function NotFound() { return <main className="auth-page"><div className="auth-card"><p className="eyebrow">404</p><h1>找不到這個頁面</h1><p className="muted">內容可能已移動、尚未發布，或網址輸入錯誤。</p><Link href="/" className="button button-primary">返回首頁</Link></div></main>; }
