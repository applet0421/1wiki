"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="auth-page"><div className="auth-card"><p className="eyebrow">發生錯誤</p><h1>暫時無法載入</h1><p className="muted">請稍後重試；如果問題持續發生，請聯絡網站管理者。</p><button className="button button-primary" onClick={reset}>重新載入</button></div></main>; }
