# 1Wiki

最後更新：2026-09-04

1Wiki 是以繁體中文提供 AI、軟體、社群與 3C 使用教學及疑難解答的內容網站。

## 開發狀態

專案正在依 [`docs/superpowers/specs/2026-09-04-1wiki-adsense-seo-mvp-design.md`](docs/superpowers/specs/2026-09-04-1wiki-adsense-seo-mvp-design.md) 建置 MVP。

## 本機啟動

需要 Node.js 22 與 PostgreSQL 17。

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 上游來源

本專案選擇性移植並重構 [SamurAIGPT/blogger-cms](https://github.com/SamurAIGPT/blogger-cms) 的 Rich Text Editor 與文章管理概念。原始專案採 MIT License；授權文字見 [`LICENSE.upstream`](LICENSE.upstream)。Stripe、credits、pricing、MuAPI、Google OAuth 與使用者 API key 登入不屬於本專案。
