# Teams Dashboard

Claude Code Agent Teams 的可视化群聊式管理面板。

## 功能特性

- **团队列表**：左侧显示所有 Claude Code Agent Teams
- **成员管理**：中间面板显示团队成员，支持点击查看详情
- **群聊视图**：聚合显示团队所有消息，类似微信群聊界面
- **任务列表**：查看团队任务及其状态
- **实时更新**：通过 WebSocket 自动同步文件系统变化
- **消息格式化**：自动识别协议消息（JSON）并格式化显示

## 安装与运行

```bash
# 进入项目目录
cd D:\workspace\teams-dashboard

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
|   团队列表     |   成员/群聊/任务 |       详情面板         |
|               |                |                        |
|               |                |                        |
|  • Team A     |  成员列表       |   成员信息              |
|  • Team B     |  -----------   |   Inbox 消息            |
|               |                |                        |
|               |  [成员][群聊][任务]                        |
|               |                |                        |
|               |  群聊视图       |   团队概览              |
|               |  ============  |   成员网格              |
|               |  Alice: 你好    |   任务统计              |
|               |  Bob: 收到      |                        |
|               |                |                        |
+---------------+----------------+------------------------+
```

## 技术栈

- **后端**：Node.js + Express + WebSocket
- **前端**：原生 JavaScript + CSS3
- **文件监控**：chokidar（实时监听 ~/.claude/teams/ 变化）

## 目录结构

```
├── server.js          # 主服务器
├── package.json
├── README.md
└── public/
    ├── index.html     # 主页面
    ├── style.css      # 样式表
    └── app.js         # 前端逻辑
```

## 数据读取路径

- **团队配置**：`~/.claude/teams/{team-id}/config.json`
- **成员收件箱**：`~/.claude/teams/{team-id}/inboxes/{member}.json`
- **任务列表**：`~/.claude/tasks/{team-id}/{task-id}.json`

## 使用提示

1. 面板为只读模式，不会修改 Claude Code 的数据
2. 刷新页面或点击刷新按钮可强制重新加载数据
3. 协议消息（如 idle_notification）会自动格式化显示为 JSON
4. 支持深色模式主题

## License

MIT
