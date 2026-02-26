// Teams Dashboard - Frontend

const API_BASE = '';
let ws = null;
let currentTeam = null;
let currentMember = null;
let currentTask = null;
let currentView = 'members';
let currentTasks = []; // Cache tasks data

// Utility: Format timestamp
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Utility: Get avatar color based on name
function getAvatarColor(name) {
  const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'cyan', 'gold', 'red'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Utility: Get initials from name
function getInitials(name) {
  return name.slice(0, 2).toUpperCase();
}

// Utility: Check if message is a protocol message
function isProtocolMessage(text) {
  if (!text) return false;
  try {
    const parsed = JSON.parse(text);
    return parsed && parsed.type !== undefined;
  } catch {
    return false;
  }
}

// Utility: Format protocol message
function formatProtocolMessage(text) {
  try {
    const parsed = JSON.parse(text);
    return `<pre>${JSON.stringify(parsed, null, 2)}</pre>`;
  } catch {
    return text;
  }
}

// Check if marked is loaded
let markedLoaded = false;
let markedCheckInterval = null;

function updateMarkdownStatus(status) {
  const statusEl = document.getElementById('markdownStatus');
  if (!statusEl) return;

  if (status === 'ready') {
    statusEl.className = 'markdown-status ready';
    statusEl.innerHTML = '<span>Markdown ✓</span>';
    // Hide after 3 seconds
    setTimeout(() => {
      statusEl.style.opacity = '0';
    }, 3000);
  } else if (status === 'error') {
    statusEl.className = 'markdown-status error';
    statusEl.innerHTML = '<span>Markdown 加载失败</span>';
  }
}

function checkMarkedLoaded() {
  if (typeof marked !== 'undefined' && marked.parse) {
    markedLoaded = true;
    console.log('Marked is ready');
    updateMarkdownStatus('ready');
    if (markedCheckInterval) {
      clearInterval(markedCheckInterval);
      markedCheckInterval = null;
    }
    return true;
  }
  return false;
}

// Start checking for marked
if (!checkMarkedLoaded()) {
  markedCheckInterval = setInterval(() => {
    if (checkMarkedLoaded()) {
      // Re-render current view if needed
      if (currentTeam && currentMember) {
        loadMemberDetail(currentTeam, currentMember);
      } else if (currentTeam && currentView === 'chat') {
        loadTeamMessages(currentTeam);
      }
    }
  }, 100);
  // Stop checking after 10 seconds
  setTimeout(() => {
    if (markedCheckInterval) {
      clearInterval(markedCheckInterval);
      markedCheckInterval = null;
      console.warn('Marked failed to load after 10 seconds');
      updateMarkdownStatus('error');
    }
  }, 10000);
}

// Utility: Format message content (with Markdown support)
function formatMessageContent(text) {
  if (!text) return '';

  if (isProtocolMessage(text)) {
    return formatProtocolMessage(text);
  }

  // Use marked to render Markdown
  if (typeof marked !== 'undefined' && marked.parse) {
    try {
      return marked.parse(text, {
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
        sanitize: false
      });
    } catch (e) {
      console.error('Markdown parsing error:', e);
      // Fallback to plain text with basic formatting
      return escapeHtml(text).replace(/\n/g, '<br>');
    }
  }

  // Fallback if marked is not loaded - show loading indicator
  return '<span class="markdown-loading">Loading markdown renderer...</span>' +
         '<pre style="display:none">' + escapeHtml(text) + '</pre>';
}

// Utility: Escape HTML
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initialize WebSocket connection
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connected');
    updateConnectionStatus('connected');
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    updateConnectionStatus('disconnected');
    // Reconnect after 3 seconds
    setTimeout(initWebSocket, 3000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    updateConnectionStatus('disconnected');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWebSocketMessage(data);
  };
}

// Update connection status UI
function updateConnectionStatus(status) {
  const statusEl = document.getElementById('connectionStatus');
  const textEl = statusEl.querySelector('.status-text');

  statusEl.className = `connection-status ${status}`;

  const texts = {
    connected: '已连接',
    connecting: '连接中...',
    disconnected: '已断开'
  };
  textEl.textContent = texts[status] || status;
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
  if (data.type === 'update') {
    // Refresh data based on the file that changed
    const path = data.path || '';

    if (path.includes('/inboxes/') && currentTeam) {
      // Refresh messages if we're viewing the team
      loadTeamMessages(currentTeam);

      // Refresh member detail if viewing a member
      if (currentMember) {
        loadMemberDetail(currentTeam, currentMember);
      }
    } else if (path.includes('/tasks/') && currentTeam) {
      // Refresh tasks
      if (currentView === 'tasks') {
        loadTeamTasks(currentTeam);
      }
    } else if (path.includes('config.json')) {
      // Refresh teams list
      loadTeams();

      // Refresh members if viewing a team
      if (currentTeam) {
        loadTeamMembers(currentTeam);
      }
    }
  }
}

// Load all teams
async function loadTeams() {
  try {
    const response = await fetch(`${API_BASE}/api/teams`);
    const teams = await response.json();

    const container = document.getElementById('teamsList');

    if (teams.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>未找到团队</p>
          <p style="font-size: 12px; margin-top: 8px;">
            确保 ~/.claude/teams/ 目录存在且有内容
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = teams.map(team => `
      <div class="team-item ${team.id === currentTeam ? 'active' : ''}" data-team-id="${team.id}">
        <div class="team-name">${team.name}</div>
        <div class="team-info">${team.members?.length || 0} 成员</div>
        ${team.leadAgentId ? `<div class="team-lead">Lead: ${team.leadAgentId.split('@')[0]}</div>` : ''}
      </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.team-item').forEach(item => {
      item.addEventListener('click', () => {
        const teamId = item.dataset.teamId;
        selectTeam(teamId);
      });
    });
  } catch (error) {
    console.error('Error loading teams:', error);
    document.getElementById('teamsList').innerHTML = `
      <div class="empty-state">
        <p>加载失败</p>
        <p style="font-size: 12px; margin-top: 8px;">${error.message}</p>
      </div>
    `;
  }
}

// Select a team
async function selectTeam(teamId) {
  currentTeam = teamId;
  currentMember = null;

  // Update UI
  document.querySelectorAll('.team-item').forEach(item => {
    item.classList.toggle('active', item.dataset.teamId === teamId);
  });

  // Update team title
  try {
    const response = await fetch(`${API_BASE}/api/teams/${teamId}`);
    const team = await response.json();
    document.getElementById('teamTitle').textContent = team.name || '选择一个团队';
  } catch {
    document.getElementById('teamTitle').textContent = '选择一个团队';
  }

  // Reset member detail panel
  document.getElementById('memberDetailPanel').innerHTML = `
    <div class="empty-state large">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
      <p>选择一个成员查看详情</p>
    </div>
  `;

  // Load based on current view
  if (currentView === 'members') {
    await loadTeamMembers(teamId);
  } else if (currentView === 'chat') {
    await loadTeamMessages(teamId);
  } else if (currentView === 'tasks') {
    await loadTeamTasks(teamId);
  }
}

// Load team members
async function loadTeamMembers(teamId) {
  try {
    const response = await fetch(`${API_BASE}/api/teams/${teamId}/members`);
    const members = await response.json();

    const container = document.getElementById('membersList');

    if (members.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无成员</div>';
      return;
    }

    container.innerHTML = members.map(member => {
      const color = getAvatarColor(member.name);
      const isLead = member.name === 'team-lead';
      return `
        <div class="member-item ${member.name === currentMember ? 'active' : ''}" data-member-name="${member.name}">
          <div class="member-avatar color-${color}">${getInitials(member.name)}</div>
          <div class="member-info">
            <div class="member-name">${member.name} ${isLead ? '<span style="color: var(--accent-green)">(Lead)</span>' : ''}</div>
            <div class="member-role">${member.model || 'Unknown model'}</div>
          </div>
          <div class="member-status ${member.status || 'online'}"></div>
        </div>
      `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.member-item').forEach(item => {
      item.addEventListener('click', () => {
        const memberName = item.dataset.memberName;
        selectMember(teamId, memberName);
      });
    });
  } catch (error) {
    console.error('Error loading members:', error);
    document.getElementById('membersList').innerHTML = `
      <div class="empty-state">加载失败: ${error.message}</div>
    `;
  }
}

// Select a member
async function selectMember(teamId, memberName) {
  currentMember = memberName;

  // Update UI
  document.querySelectorAll('.member-item').forEach(item => {
    item.classList.toggle('active', item.dataset.memberName === memberName);
  });

  // Load member detail
  await loadMemberDetail(teamId, memberName);
}

// Load member detail
async function loadMemberDetail(teamId, memberName) {
  try {
    const response = await fetch(`${API_BASE}/api/teams/${teamId}/members/${memberName}`);
    const member = await response.json();

    const container = document.getElementById('memberDetailPanel');
    const color = getAvatarColor(member.name);

    container.innerHTML = `
      <div class="member-detail">
        <div class="member-detail-header">
          <div class="member-detail-avatar color-${color}">${getInitials(member.name)}</div>
          <div class="member-detail-info">
            <h2>${member.name}</h2>
            <div class="member-detail-meta">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                ${member.model || 'Unknown model'}
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                ${member.agentType || 'Standard'}
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                </svg>
                ${member.backendType || 'in-process'}
              </span>
              ${member.color ? `
                <span style="color: var(--accent-${member.color}) || ${member.color}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                  ${member.color}
                </span>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h3>配置信息</h3>
          <div class="detail-card">
            <div class="detail-row">
              <span class="detail-label">Name</span>
              <span class="detail-value">${member.name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Model</span>
              <span class="detail-value">${member.model || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Agent Type</span>
              <span class="detail-value">${member.agentType || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Backend Type</span>
              <span class="detail-value">${member.backendType || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Color</span>
              <span class="detail-value">${member.color || 'N/A'}</span>
            </div>
            ${member.tools ? `
              <div class="detail-row">
                <span class="detail-label">Tools</span>
                <span class="detail-value">${member.tools.join(', ')}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="detail-section">
          <h3>Inbox 消息 (${member.inbox?.length || 0})</h3>
          ${member.inbox && member.inbox.length > 0 ? `
            <div class="inbox-messages">
              ${member.inbox.slice().reverse().map(msg => {
                const isProtocol = isProtocolMessage(msg.text);
                return `
                  <div class="inbox-message ${isProtocol ? 'protocol-message' : ''}">
                    <div class="inbox-message-header">
                      <span class="inbox-message-from">${msg.from}</span>
                      <span class="inbox-message-time">${formatTime(msg.timestamp)}</span>
                    </div>
                    <div class="inbox-message-content">
                      ${formatMessageContent(msg.text)}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : '<div class="detail-card"><p style="color: var(--text-muted); padding: 16px;">暂无消息</p></div>'}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading member detail:', error);
    document.getElementById('memberDetailPanel').innerHTML = `
      <div class="empty-state">
        <p>加载成员详情失败</p>
        <p style="font-size: 12px; margin-top: 8px;">${error.message}</p>
      </div>
    `;
  }
}

// Load team messages (group chat)
// Constants for text folding
const TEXT_FOLD_THRESHOLD = 800; // 字符阈值，超过则折叠
const TEXT_FOLD_LENGTH = 400;    // 折叠后显示的长度

// Generate a unique ID for each message
function generateMessageId() {
  return 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Format message content with folding support
function formatMessageContentWithFolding(text, msgId) {
  if (!text) return '';

  // Protocol messages don't need folding
  if (isProtocolMessage(text)) {
    return formatProtocolMessage(text);
  }

  // Check if text needs folding
  const needsFolding = text.length > TEXT_FOLD_THRESHOLD;
  const formattedContent = formatMessageContent(text);

  if (!needsFolding) {
    return formattedContent;
  }

  // Create folded version
  const previewText = text.substring(0, TEXT_FOLD_LENGTH);
  const previewContent = formatMessageContent(previewText + '...');

  return `
    <div class="message-content-wrapper" data-msg-id="${msgId}">
      <div class="message-preview">${previewContent}</div>
      <div class="message-full" style="display: none;">${formattedContent}</div>
      <button class="message-expand-btn" onclick="toggleMessageExpand('${msgId}')">
        <span>显示全部</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>
  `;
}

// Toggle message expand/collapse
function toggleMessageExpand(msgId) {
  const wrapper = document.querySelector(`.message-content-wrapper[data-msg-id="${msgId}"]`);
  if (!wrapper) return;

  const preview = wrapper.querySelector('.message-preview');
  const full = wrapper.querySelector('.message-full');
  const btn = wrapper.querySelector('.message-expand-btn');
  const btnText = btn.querySelector('span');

  const isExpanded = full.style.display !== 'none';

  if (isExpanded) {
    // Collapse
    preview.style.display = 'block';
    full.style.display = 'none';
    btnText.textContent = '显示全部';
    btn.classList.remove('expanded');
  } else {
    // Expand
    preview.style.display = 'none';
    full.style.display = 'block';
    btnText.textContent = '收起内容';
    btn.classList.add('expanded');
  }
}

async function loadTeamMessages(teamId) {
  try {
    const response = await fetch(`${API_BASE}/api/teams/${teamId}/messages`);
    const messages = await response.json();

    const container = document.getElementById('chatMessages');

    if (messages.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无消息</div>';
      return;
    }

    // Group messages by sender for better display
    container.innerHTML = messages.map((msg, index) => {
      const isProtocol = isProtocolMessage(msg.text);
      const color = getAvatarColor(msg.from);
      const isLead = msg.to === 'team-lead';
      const msgId = generateMessageId() + '-' + index;

      return `
        <div class="chat-message ${isProtocol ? 'protocol-message' : ''} ${isLead ? 'to-lead' : ''}">
          <div class="chat-message-header">
            <span class="chat-message-author" style="color: var(--accent-${color})">${msg.from}</span>
            ${msg.to ? `<span style="color: var(--text-muted); font-size: 11px;">→ ${msg.to}</span>` : ''}
            <span class="chat-message-time">${formatTime(msg.timestamp)}</span>
          </div>
          <div class="chat-message-content">
            ${formatMessageContentWithFolding(msg.text, msgId)}
          </div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  } catch (error) {
    console.error('Error loading messages:', error);
    document.getElementById('chatMessages').innerHTML = `
      <div class="empty-state">加载消息失败: ${error.message}</div>
    `;
  }
}

// Load team tasks
async function loadTeamTasks(teamId) {
  try {
    const response = await fetch(`${API_BASE}/api/teams/${teamId}/tasks`);
    const tasks = await response.json();

    // Cache tasks data for detail view
    currentTasks = tasks;

    const container = document.getElementById('tasksList');

    if (tasks.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无任务</div>';
      return;
    }

    // Status mapping: English to Chinese
    const statusMap = {
      'pending': { text: '待处理', class: 'pending' },
      'in_progress': { text: '进行中', class: 'in_progress' },
      'completed': { text: '已完成', class: 'completed' }
    };

    container.innerHTML = tasks.map(task => {
      const statusInfo = statusMap[task.status] || statusMap['pending'];
      const ownerName = task.owner ? task.owner.split('@')[0] : '';
      return `
        <div class="task-item ${statusInfo.class} ${task.id === currentTask ? 'active' : ''}" data-task-id="${task.id}">
          <div class="task-id">#${task.id}</div>
          <div class="task-content">
            <div class="task-subject">${task.subject}</div>
            <div class="task-meta">
              <span class="task-status">${statusInfo.text}</span>
              ${task.owner ? `<span class="task-status" style="background: var(--bg-tertiary);">@${ownerName}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers for task items
    container.querySelectorAll('.task-item').forEach(item => {
      item.addEventListener('click', () => {
        const taskId = item.dataset.taskId;
        selectTask(teamId, taskId);
      });
    });
  } catch (error) {
    console.error('Error loading tasks:', error);
    document.getElementById('tasksList').innerHTML = `
      <div class="empty-state">加载任务失败: ${error.message}</div>
    `;
  }
}

// Select a task
async function selectTask(teamId, taskId) {
  currentTask = taskId;

  // Update UI - highlight selected task
  document.querySelectorAll('.task-item').forEach(item => {
    item.classList.toggle('active', item.dataset.taskId === taskId);
  });

  // Load task detail
  await loadTaskDetail(teamId, taskId);
}

// Load task detail
async function loadTaskDetail(teamId, taskId) {
  try {
    // Find task from cached data
    const task = currentTasks.find(t => t.id === taskId);

    const container = document.getElementById('taskDetailPanel') || document.getElementById('memberDetailPanel');

    if (!task) {
      container.innerHTML = `
        <div class="empty-state">
          <p>任务未找到</p>
        </div>
      `;
      return;
    }

    // Status mapping: English to Chinese
    const statusMap = {
      'pending': { text: '待处理', class: 'pending' },
      'in_progress': { text: '进行中', class: 'in_progress' },
      'completed': { text: '已完成', class: 'completed' }
    };
    const statusInfo = statusMap[task.status] || statusMap['pending'];

    container.innerHTML = `
      <div class="task-detail">
        <div class="task-detail-header">
          <div class="task-detail-id">任务 #${task.id}</div>
          <h2>${task.subject}</h2>
          <div class="task-detail-meta">
            <span class="task-status ${statusInfo.class}">${statusInfo.text}</span>
            ${task.owner ? `<span class="task-owner">@${task.owner}</span>` : ''}
          </div>
        </div>

        <div class="detail-section">
          <h3>任务描述</h3>
          <div class="detail-card">
            <div class="task-description">
              ${task.description ? formatMessageContent(task.description) : '<p style="color: var(--text-muted);">暂无描述</p>'}
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h3>任务信息</h3>
          <div class="detail-card">
            <div class="detail-row">
              <span class="detail-label">任务 ID</span>
              <span class="detail-value">${task.id}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">状态</span>
              <span class="detail-value">
                <span class="task-status ${statusInfo.class}">${statusInfo.text}</span>
              </span>
            </div>
            ${task.owner ? `
              <div class="detail-row">
                <span class="detail-label">负责人</span>
                <span class="detail-value">${task.owner}</span>
              </div>
            ` : ''}
            ${task.activeForm ? `
              <div class="detail-row">
                <span class="detail-label">活跃状态</span>
                <span class="detail-value">${task.activeForm}</span>
              </div>
            ` : ''}
          </div>
        </div>

        ${task.blockedBy && task.blockedBy.length > 0 ? `
          <div class="detail-section">
            <h3>阻塞任务</h3>
            <div class="detail-card">
              <div class="blocked-tasks">
                ${task.blockedBy.map(blockedId => `
                  <span class="blocked-task-item" onclick="selectTask('${teamId}', '${blockedId}')" style="cursor: pointer; color: var(--accent-blue);">#${blockedId}</span>
                `).join(', ')}
              </div>
            </div>
          </div>
        ` : ''}

        ${task.blocks && task.blocks.length > 0 ? `
          <div class="detail-section">
            <h3>阻塞以下任务</h3>
            <div class="detail-card">
              <div class="blocked-tasks">
                ${task.blocks.map(blocksId => `
                  <span class="blocked-task-item" onclick="selectTask('${teamId}', '${blocksId}')" style="cursor: pointer; color: var(--accent-blue);">#${blocksId}</span>
                `).join(', ')}
              </div>
            </div>
          </div>
        ` : ''}

        ${task.metadata ? `
          <div class="detail-section">
            <h3>元数据</h3>
            <div class="detail-card">
              <pre style="overflow-x: auto; font-size: 12px;">${JSON.stringify(task.metadata, null, 2)}</pre>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  } catch (error) {
    console.error('Error loading task detail:', error);
    const errorContainer = document.getElementById('taskDetailPanel') || document.getElementById('memberDetailPanel');
    errorContainer.innerHTML = `
      <div class="empty-state">
        <p>加载任务详情失败</p>
        <p style="font-size: 12px; margin-top: 8px;">${error.message}</p>
      </div>
    `;
  }
}

// View switching
function initViews() {
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      const viewName = tab.dataset.view;
      if (!currentTeam) return;

      // Update UI
      document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`${viewName}View`).classList.add('active');

      // Update layout for detail panel visibility
      const membersView = document.getElementById('membersView');
      const tasksView = document.getElementById('tasksView');

      if (viewName === 'tasks') {
        // Tasks view uses split layout like members
        tasksView.innerHTML = `
          <div class="split-layout">
            <aside class="task-list-panel">
              <div id="tasksList" class="tasks-list">
                <div class="empty-state">加载中...</div>
              </div>
            </aside>
            <div id="taskDetailPanel" class="detail-content-panel">
              <div class="empty-state large">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M9 11l3 3L22 4"></path>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <p>选择一个任务查看详情</p>
              </div>
            </div>
          </div>
        `;
      } else if (viewName === 'members') {
        // Reset members view to split layout
        membersView.innerHTML = `
          <div class="split-layout">
            <aside class="member-list-panel">
              <div id="membersList" class="members-list">
                <div class="empty-state">加载中...</div>
              </div>
            </aside>
            <div id="memberDetailPanel" class="detail-content-panel">
              <div class="empty-state large">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <p>选择一个成员查看详情</p>
              </div>
            </div>
          </div>
        `;
      }

      currentView = viewName;
      currentMember = null;
      currentTask = null;

      // Load content based on view
      if (viewName === 'members') {
        await loadTeamMembers(currentTeam);
      } else if (viewName === 'chat') {
        await loadTeamMessages(currentTeam);
      } else if (viewName === 'tasks') {
        await loadTeamTasks(currentTeam);
      }
    });
  });
}

// Initialize refresh button
function initRefreshButton() {
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadTeams();
    if (currentTeam) {
      selectTeam(currentTeam);
    }
  });
}

// Initialize
function init() {
  initWebSocket();
  loadTeams();
  initViews();
  initRefreshButton();

  // Make selectMember and selectTask globally accessible for inline onclick
  window.selectMember = selectMember;
  window.selectTask = selectTask;
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
