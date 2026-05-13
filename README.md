# LQS Personal Site

一个基于 `Express + EJS` 的动态个人网站起步版，包含：

- 测试项目展示区
- 小说入口展示区
- 个人开发工具展示区
- 服务端渲染首页
- 联系表单，提交后写入 `data/messages.json`
- 首页美术资源路径：`public/assets/shinobi-hero.png`

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`

## 部署到当前腾讯云服务器

1. 在服务器安装 Node.js
2. 上传本项目文件
3. 执行：

```bash
npm install
npm start
```

4. 再让 Nginx 反向代理到 `3000` 端口

## 内容修改

站点主要展示内容在 [data/site.json](C:\Users\DZS-056\Documents\Codex\2026-05-13\excel\data\site.json)。
