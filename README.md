# 开一局

> 30 秒内为宿舍和同学聚会选出马上能玩的游戏，并提供可直接复制给豆包等 AI 工具的主持人指令。

## 当前状态

这是 `v0.1.0` 项目骨架，已经包含：

- 零依赖静态站点
- 内置 36 个聚会和酒吧游戏、24 条互动挑战
- 聚会场景选择流程
- 3 个方向的游戏推荐
- 游戏详情和主持步骤
- 可复制到豆包等 AI 工具的“AI 主持人指令”
- 非羞辱性的破冰互动库
- 酒吧模式：快速暖场、喝酒可选、不强迫饮酒
- GitHub Issue 游戏投稿页面
- 本地收藏、最近玩过和不喜欢记录
- Node 内置测试和数据校验
- GitHub Pages 自动部署配置

## 第一版范围

- 4～12 人
- 宿舍、客厅、餐厅、户外
- 5～30 分钟
- 无复杂道具
- 默认不涉及酒精、危险动作和羞辱性惩罚
- 不接入豆包，不控制任何第三方通话功能

## 本地运行

需要 Node.js 20 或更高版本。

```powershell
node scripts/dev-server.js
```

然后打开：

```text
http://127.0.0.1:4173
```

也可以使用 npm：

```powershell
npm run dev
```

## 检查项目

```powershell
npm test
npm run validate:data
```

不安装 npm 也可以直接运行：

```powershell
node --test
node scripts/validate-data.js
```

## 目录结构

```text
.
├── index.html
├── src/
│   ├── app.js
│   ├── styles.css
│   ├── data/games.json
│   ├── data/interactions.json
│   └── features/
│       ├── ai-host.js
│       ├── interactions.js
│       ├── submission-view.js
│       ├── submission.js
│       ├── recommend.js
│       └── storage.js
├── scripts/
│   ├── build.js
│   ├── dev-server.js
│   ├── validate-data.js
│   ├── validate-games.js
│   └── validate-interactions.js
├── tests/
├── docs/
└── .github/workflows/pages.yml
```

## 安全

项目当前不会直接调用 AI API，也不需要在仓库中保存 API Key。以后接入服务端 AI 能力前，请先阅读 [SECURITY.md](./SECURITY.md)。

## 许可证

代码使用 MIT License。游戏说明和原创主持指令后续可单独采用适合内容的开放许可证。

## 贡献

请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)、[docs/game-schema.md](./docs/game-schema.md) 和 [docs/interaction-schema.md](./docs/interaction-schema.md)。

也可以通过网站内的 [投稿页面](https://kiraaa828.github.io/kai-yiju/#/submit) 或 [GitHub Issue 模板](https://github.com/kiraaa828/kai-yiju/issues/new/choose) 提交新游戏。

不要直接复制其他网站、商业桌游或付费应用的大段规则。所有新增游戏都需要用原创描述改写，并尽量实际测试。
