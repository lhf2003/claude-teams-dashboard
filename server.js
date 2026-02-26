const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Claude Code teams directory
const CLAUDE_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude');
const TEAMS_DIR = path.join(CLAUDE_DIR, 'teams');
const TASKS_DIR = path.join(CLAUDE_DIR, 'tasks');

// Store connected clients
const clients = new Set();

// Watch for file changes
let watcher = null;

// Utility: Get all teams
async function getTeams() {
  try {
    if (!await fs.pathExists(TEAMS_DIR)) {
      return [];
    }
    const entries = await fs.readdir(TEAMS_DIR);
    const teams = [];
    for (const entry of entries) {
      const configPath = path.join(TEAMS_DIR, entry, 'config.json');
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        teams.push({
          id: entry,
          ...config
        });
      }
    }
    return teams;
  } catch (error) {
    console.error('Error reading teams:', error);
    return [];
  }
}

// Utility: Get team members
async function getTeamMembers(teamId) {
  try {
    const configPath = path.join(TEAMS_DIR, teamId, 'config.json');
    if (!await fs.pathExists(configPath)) {
      return [];
    }
    const config = await fs.readJson(configPath);
    return config.members || [];
  } catch (error) {
    console.error('Error reading team members:', error);
    return [];
  }
}

// Utility: Get member inbox messages
async function getMemberInbox(teamId, memberName) {
  try {
    const inboxPath = path.join(TEAMS_DIR, teamId, 'inboxes', `${memberName}.json`);
    if (!await fs.pathExists(inboxPath)) {
      return [];
    }
    return await fs.readJson(inboxPath);
  } catch (error) {
    console.error('Error reading inbox:', error);
    return [];
  }
}

// Utility: Get all team messages (group chat)
async function getTeamMessages(teamId) {
  try {
    const members = await getTeamMembers(teamId);
    const allMessages = [];

    for (const member of members) {
      const inbox = await getMemberInbox(teamId, member.name);
      for (const msg of inbox) {
        allMessages.push({
          ...msg,
          to: member.name
        });
      }
    }

    // Sort by timestamp
    allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return allMessages;
  } catch (error) {
    console.error('Error reading team messages:', error);
    return [];
  }
}

// Utility: Get team tasks
async function getTeamTasks(teamId) {
  try {
    const tasksPath = path.join(TASKS_DIR, teamId);
    if (!await fs.pathExists(tasksPath)) {
      return [];
    }
    const files = await fs.readdir(tasksPath);
    const tasks = [];
    for (const file of files) {
      if (file.endsWith('.json') && file !== '.lock') {
        const taskPath = path.join(tasksPath, file);
        const task = await fs.readJson(taskPath);
        tasks.push(task);
      }
    }
    return tasks.sort((a, b) => parseInt(a.id) - parseInt(b.id));
  } catch (error) {
    console.error('Error reading tasks:', error);
    return [];
  }
}

// Watch for changes in teams directory
function startWatching() {
  if (watcher) {
    watcher.close();
  }

  watcher = chokidar.watch([
    path.join(TEAMS_DIR, '*/config.json'),
    path.join(TEAMS_DIR, '*/inboxes/*.json'),
    path.join(TASKS_DIR, '*/*.json')
  ], {
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('all', async (event, filePath) => {
    console.log(`File changed: ${filePath} (${event})`);

    // Notify all connected clients
    const data = {
      type: 'update',
      event,
      path: filePath,
      timestamp: Date.now()
    };

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// API Routes

// Get all teams
app.get('/api/teams', async (req, res) => {
  const teams = await getTeams();
  res.json(teams);
});

// Get specific team
app.get('/api/teams/:teamId', async (req, res) => {
  const { teamId } = req.params;
  const configPath = path.join(TEAMS_DIR, teamId, 'config.json');

  if (!await fs.pathExists(configPath)) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const config = await fs.readJson(configPath);
  res.json({ id: teamId, ...config });
});

// Get team members
app.get('/api/teams/:teamId/members', async (req, res) => {
  const { teamId } = req.params;
  const members = await getTeamMembers(teamId);
  res.json(members);
});

// Get specific member details
app.get('/api/teams/:teamId/members/:memberName', async (req, res) => {
  const { teamId, memberName } = req.params;
  const members = await getTeamMembers(teamId);
  const member = members.find(m => m.name === memberName);

  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  // Get member's inbox
  const inbox = await getMemberInbox(teamId, memberName);

  res.json({
    ...member,
    inbox
  });
});

// Get team messages (group chat)
app.get('/api/teams/:teamId/messages', async (req, res) => {
  const { teamId } = req.params;
  const messages = await getTeamMessages(teamId);
  res.json(messages);
});

// Get team tasks
app.get('/api/teams/:teamId/tasks', async (req, res) => {
  const { teamId } = req.params;
  const tasks = await getTeamTasks(teamId);
  res.json(tasks);
});

// Start watching for file changes
startWatching();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Teams Dashboard Server running on http://localhost:${PORT}`);
  console.log(`Monitoring teams in: ${TEAMS_DIR}`);
  console.log(`Monitoring tasks in: ${TASKS_DIR}`);
});
