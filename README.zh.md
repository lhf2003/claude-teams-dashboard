# Teams Dashboard

[English](./README.md) | **中文**

Claude Code Agent Teams 的可视化群聊式管理面板。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

## 功能特性

- **团队列表**：左侧显示所有 Claude Code Agent Teams
- **成员管理**：中间面板显示团队成员，支持点击查看详情
- **群聊视图**：聚合显示团队所有消息，类似微信群聊界面
- **任务列表**：查看团队任务及其状态，支持点击展开详情
- **实时更新**：通过 WebSocket 自动同步文件系统变化
- **消息格式化**：自动识别协议消息（JSON）并格式化显示
- **深色模式**：支持深色主题，护眼舒适

## 界面截图

![Teams Dashboard 布局](./layout-final.png)

## 安装与运行

```bash
# 克隆仓库
git clone https://github.com/your-username/claude-teams-dashboard.git
cd claude-teams-dashboard

# 安装依赖
npm install

# 启动服务
npm start
```

访问 http://localhost:3000

## 界面布局

```
+---------------+----------------+------------------------+
|               |                |                        |
|   团队列表     |   成员/群聊    |       详情面板         |
|               |     /任务      |                        |
|               |                |                        |
|  • Team A     |  成员列表       |   成员信息              |
|  • Team B     |  -----------   |   Inbox 消息            |
|               |                |                        |
|               | [成员][群聊]    |                        |
|               |    [任务]      |                        |
|               |                |   任务描述              |
|               |  群聊视图       |   任务状态              |
|               |  ============  |   负责人                |
|               |  Alice: 你好    |   阻塞任务              |
|               |  Bob: 收到      |                        |
|               |                |                        |
+---------------+----------------+------------------------+
```

## 技术栈

- **后端**：Node.js + Express + WebSocket (ws)
- **前端**：原生 JavaScript + CSS3
- **文件监控**：chokidar（实时监听 ~/.claude/teams/ 变化）
- **Markdown 渲染**：marked.js

## 项目结构

```
├── server.js          # 主服务器（含 WebSocket 支持）
├── package.json       # 依赖和脚本
├── README.md          # 英文文档
├── README.zh.md       # 本文档（中文）
├── CLAUDE.md          # Claude Code 开发指南
├── .gitignore         # Git 忽略规则
└── public/            # 静态资源
    ├── index.html     # 主页面
    ├── style.css      # 样式（Apple 风格设计）
    └── app.js         # 前端 JavaScript 逻辑
```

## 数据源

面板从 Claude Code 的团队目录中读取数据：

| 数据类型 | 路径 |
|---------|------|
| 团队配置 | `~/.claude/teams/{team-id}/config.json` |
| 成员收件箱 | `~/.claude/teams/{team-id}/inboxes/{member}.json` |
| 任务列表 | `~/.claude/tasks/{team-id}/{task-id}.json` |

## 开发命令

```bash
# 开发模式运行（如使用 nodemon 可自动重载）
npm run dev

# 或简单启动
npm start
```

## 使用提示

1. 面板为只读模式，不会修改 Claude Code 的数据
2. 刷新页面或点击刷新按钮可强制重新加载数据
3. 协议消息（如 `idle_notification`）会自动格式化显示为 JSON
4. WebSocket 断开时会自动重连

## 浏览器支持

- Chrome/Edge（最新版）
- Firefox（最新版）
- Safari（最新版）

## 贡献

欢迎贡献代码！请随时提交 Pull Request。

## 许可证

MIT 许可证 - 详情请查看 [LICENSE](./LICENSE) 文件。

---

<p align="center">专为 Claude Code Agent Teams 打造 ❤️</p>
