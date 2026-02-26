# Teams Dashboard

**English** | [中文](./README.zh.md)

A visual group-chat style management dashboard for Claude Code Agent Teams.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

## Features

- **Team List**: Displays all Claude Code Agent Teams on the left sidebar
- **Member Management**: Shows team members with clickable detail view
- **Group Chat View**: Aggregates all team messages in a WeChat-like interface
- **Task List**: View tasks with status and detailed information
- **Real-time Updates**: WebSocket-powered live synchronization of file system changes
- **Message Formatting**: Automatic detection and formatting of protocol messages (JSON)

## Screenshots

![Teams Dashboard Layout](./layout-final.png)

## Installation & Usage

```bash
# Clone the repository
git clone https://github.com/your-username/claude-teams-dashboard.git
cd claude-teams-dashboard

# Install dependencies
npm install

# Start the server
npm start
```

Visit http://localhost:3000

## UI Layout

```
+---------------+----------------+------------------------+
|               |                |                        |
|   Team List   |  Members/Chat  |      Detail Panel      |
|               |     /Tasks     |                        |
|               |                |                        |
|  • Team A     |  Member List   |   Member Info          |
|  • Team B     |  -----------   |   Inbox Messages       |
|               |                |                        |
|               | [Members][Chat]|                        |
|               |    [Tasks]     |                        |
|               |                |   Team Overview        |
|               |  Chat View     |   Member Grid          |
|               |  ============  |   Task Stats           |
|               |  Alice: Hello  |                        |
|               |  Bob: Got it   |                        |
|               |                |                        |
+---------------+----------------+------------------------+
```

## Tech Stack

- **Backend**: Node.js + Express + WebSocket (ws)
- **Frontend**: Vanilla JavaScript + CSS3
- **File Watcher**: chokidar (monitors ~/.claude/teams/ for changes)
- **Markdown Renderer**: marked.js

## Project Structure

```
├── server.js          # Main server with WebSocket support
├── package.json       # Dependencies and scripts
├── README.md          # This file (English)
├── README.zh.md       # Chinese documentation
├── CLAUDE.md          # Development guide for Claude Code
├── .gitignore         # Git ignore rules
└── public/            # Static assets
    ├── index.html     # Main HTML page
    ├── style.css      # Styles with Apple-inspired design
    └── app.js         # Frontend JavaScript logic
```

## Data Sources

The dashboard reads data from Claude Code's team directories:

| Data Type | Path |
|-----------|------|
| Team Config | `~/.claude/teams/{team-id}/config.json` |
| Member Inbox | `~/.claude/teams/{team-id}/inboxes/{member}.json` |
| Tasks | `~/.claude/tasks/{team-id}/{task-id}.json` |

## Development Commands

```bash
# Run in development mode (with auto-reload if using nodemon)
npm run dev

# Or simply
npm start
```

## Tips

1. The dashboard is read-only and will not modify Claude Code's data
2. Refresh the page or click the refresh button to force reload data
3. Protocol messages (e.g., idle_notification) are automatically formatted as JSON
4. WebSocket connection auto-reconnects on disconnect

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

---

<p align="center">Made with ❤️ for Claude Code Agent Teams</p>
