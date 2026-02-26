# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Teams Dashboard** - a web-based visualization panel for Claude Code Agent Teams. It provides a group-chat-style interface to monitor teams, members, tasks, and messages in real-time.

## Common Commands

```bash
# Install dependencies
npm install

# Start the server
npm start
# or
npm run dev

# Server runs on http://localhost:3000 (or PORT env variable)
```

## Architecture

### Backend (server.js)

- **Express.js** HTTP server with **WebSocket** support for real-time updates
- **File-based data source**: Reads from `~/.claude/teams/` and `~/.claude/tasks/` directories
- **chokidar** watches for file system changes and broadcasts updates to connected clients via WebSocket

**Key data paths:**
- Team config: `~/.claude/teams/{team-id}/config.json`
- Member inboxes: `~/.claude/teams/{team-id}/inboxes/{member-name}.json`
- Tasks: `~/.claude/tasks/{team-id}/{task-id}.json`

**API endpoints:**
- `GET /api/teams` - List all teams
- `GET /api/teams/:teamId` - Get specific team config
- `GET /api/teams/:teamId/members` - List team members
- `GET /api/teams/:teamId/members/:memberName` - Get member details with inbox
- `GET /api/teams/:teamId/messages` - Get aggregated team messages (group chat view)
- `GET /api/teams/:teamId/tasks` - List team tasks

### Frontend (public/)

- **index.html** - Single-page application layout with three main views (members, chat, tasks)
- **app.js** - Frontend logic: WebSocket client, view switching, data rendering
- **style.css** - UI styles with light theme

**UI Layout:**
- Left sidebar: Team list
- Center panel: Contextual view (members list, group chat, or tasks)
- Right panel: Detail view (member info, team overview)

**Key frontend features:**
- WebSocket connection for live updates (`ws://localhost:3000`)
- View tabs: Members (成员), Group Chat (群聊), Tasks (任务)
- Auto-retry connection with visual status indicator
- Read-only mode (does not modify Claude Code data)

## Dependencies

- `express` - HTTP server
- `ws` - WebSocket server
- `chokidar` - File system watcher
- `fs-extra` - Enhanced file system operations
- `cors` - Cross-origin support
- `marked` - Markdown rendering (loaded via CDN in frontend)

## Development Notes

- The dashboard is **read-only** - it monitors but never modifies Claude Code's team data
- Frontend uses vanilla JavaScript (no framework)
- WebSocket reconnects automatically on disconnect
- File changes in `~/.claude/teams/` or `~/.claude/tasks/` trigger real-time UI updates

## ROOT DIRECTORY DOCUMENT SPECIFICATION

The project root directory only allows the following three documents to be retained:
- `README.md` - Project Documentation (for Users)
- `CLAUDE.md` - Claude Code Development Guide (this document)
- `AGENTS.md` - Agent Development Guide
- `CHANGELOG.md` - Project Changelog

**All other documents must be placed under the 'docs/' directory**, Refer to the document directory structure that can be created
```
docs/
├── analysis/ # Problem analysis and troubleshooting report
├── reviews/ # Code review documentation
├── fixes/ # Fix summary report
├── architecture/ # Architecture design document
└── api/ # API documentation
```

### Document naming conventions

**Forced naming format**:
- 'YYYY-MM-DD-CASE-NNN-DESCRIPTION_VERSION.md' - e.g. '2026-01-15-CASE-001-DataAnalysisError_01.md'

**Naming Conventions**:
1. **Date section**: 'YYYY-MM-DD' (YEAR-MONTH-DAY), SEPARATED USING A HYPHEN
2. **CASE Number**: 'CASE-NNN' (Nth case/issue of the day)
- For example: 'CASE-001', 'CASE-002', 'CASE-003'
- Used to identify the first issue or case that was addressed that day
3. **Description Section**: Concise and clear description in Chinese or English
4. **Version Part**: '_V' or '_v' + Serial Number (two digits, less than zero)
- For example: '_01', '_02', '_03' or '_v1.0', '_v2.0'
**Example**:
- ✅ '2026-01-15-CASE-001-DATA_ANALYSIS_ERROR_01.md'
- ✅ '2026-01-15-CASE-002-MYSQL_CONNECTION_TIMEOUT_ISSUE_01.md'
- ❌ 'Data Synchronization Failure Analysis Report_0115.md' (Date, CASE Number Missing)
- ❌ '2026-01-15-Data Synchronization Failure Analysis_01.md' (CASE number missing)
- ❌ 'temp.md' (unclear)

**CASE Number Description**:
- Number each day starting from 'CASE-001'
- Incremental number for each issue or case handled on the same day
- Easy to track and correlate all issues handled on the day
- Example:
  - '2026-01-15-CASE-001-StackOverflow Fix_01.md'
  - '2026-01-15-CASE-002-MySQL connection timeout_01.md'
  - '2026-01-15-CASE-003-Log4j2 Configuration Fix_01.md'

### Document creation process
1. If there is no subdirectory name in the docs/ directory that matches the document requirements, create a new subdirectory according to the document category.
2. When creating a new document, place it directly in the 'docs/' directory or its subdirectory
3. Use the specification file name (including date/version)
4. Include the following meta information at the beginning of the document:
   ```markdown
   # Document title

   Creation Date: YYYY-MM-DD
   **Author**: xxx
   Version: v1.0
   **Status**: Draft/Under Review/Approved
   ```
   
### Consequences of Breaking the Rules

If you violate the document management rules:
- Documents other than 'README.md' and 'CLAUDE.md' appear in the root directory
- Document naming is not standardized
- Document organization is disorganized

**Consequences**:
- Code review will be rejected
- PRs cannot be merged
- Documents need to be refreshed for submission