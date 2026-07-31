/* ============================================================
   AI 知识库与工作台 — 核心应用逻辑
   ============================================================ */

// ============================================================
// Storage Layer — localStorage 封装
// ============================================================
const Storage = {
  _prefix: 'ai_kb_',

  get(key) {
    try {
      const raw = localStorage.getItem(this._prefix + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Storage read error:', e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this._prefix + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage write error:', e);
      UI.toast('存储空间不足，请清理旧数据', 'error');
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(this._prefix + key);
  },

  // --- Todos ---
  getTodos()      { return this.get('todos') || []; },
  saveTodos(list) { return this.set('todos', list); },

  // --- Inbox ---
  getInbox()      { return this.get('inbox') || []; },
  saveInbox(list) { return this.set('inbox', list); },

  // --- Chat History ---
  getChatHistory()      { return this.get('chat_history') || []; },
  saveChatHistory(list) { return this.set('chat_history', list); },

  // --- Settings ---
  getSettings() {
    return this.get('settings') || {
      openaiKey: '',
      claudeKey: '',
      deepseekKey: '',
      preferredModel: 'deepseek',
      theme: 'dark'
    };
  },
  saveSettings(obj) { return this.set('settings', obj); },

  // --- Export All Data ---
  exportAll() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      todos: this.getTodos(),
      inbox: this.getInbox(),
      chatHistory: this.getChatHistory(),
      settings: this.getSettings()
    };
  },

  // --- Import Data ---
  importAll(data) {
    if (!data || typeof data !== 'object') return false;
    if (data.todos)    this.saveTodos(data.todos);
    if (data.inbox)    this.saveInbox(data.inbox);
    if (data.chatHistory) this.saveChatHistory(data.chatHistory);
    // Don't import settings to avoid overwriting keys unintentionally
    return true;
  },

  // --- Clear All ---
  clearAll() {
    const keys = ['todos', 'inbox', 'chat_history'];
    keys.forEach(k => this.remove(k));
  }
};

// ============================================================
// UI Helpers — Toast, Confirm, Nav, View Switching
// ============================================================
const UI = {
  currentView: 'todo',
  currentFilter: 'all', // 'all' | 'high' | 'medium' | 'low'

  // --- Toast Notification ---
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const colors = {
      info:    'border-indigo-500/50 bg-surface-800',
      success: 'border-emerald-500/50 bg-surface-800',
      error:   'border-red-500/50 bg-surface-800',
      warning: 'border-amber-500/50 bg-surface-800'
    };
    const icons = {
      info:    '💡',
      success: '✅',
      error:   '❌',
      warning: '⚠️'
    };
    const toast = document.createElement('div');
    toast.className = `toast-enter pointer-events-auto border-l-4 ${colors[type]} rounded-xl px-4 py-3 shadow-xl flex items-center gap-3 max-w-sm`;
    toast.innerHTML = `
      <span class="text-base flex-shrink-0">${icons[type]}</span>
      <span class="text-sm text-gray-200 flex-1">${this._escapeHtml(message)}</span>
      <button class="flex-shrink-0 w-5 h-5 rounded-full bg-surface-600 hover:bg-surface-500 text-gray-400 hover:text-gray-200 flex items-center justify-center text-xs transition-colors" onclick="this.closest('.toast-enter, .toast-exit').remove()">✕</button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.replace('toast-enter', 'toast-exit');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
  },

  // --- Confirm Dialog ---
  confirm(title, message) {
    return new Promise((resolve) => {
      const dialog  = document.getElementById('confirm-dialog');
      const titleEl = document.getElementById('confirm-title');
      const msgEl   = document.getElementById('confirm-message');
      const okBtn   = document.getElementById('confirm-ok');
      const cancelBtn = document.getElementById('confirm-cancel');

      titleEl.textContent = title;
      msgEl.textContent   = message;
      dialog.classList.remove('hidden');

      const cleanup = (result) => {
        dialog.classList.add('hidden');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        resolve(result);
      };
      const onOk     = () => cleanup(true);
      const onCancel = () => cleanup(false);

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      // ESC to cancel
      const onKey = (e) => { if (e.key === 'Escape') { cleanup(false); document.removeEventListener('keydown', onKey); } };
      document.addEventListener('keydown', onKey);
    });
  },

  // --- Render Navigation ---
  renderNav() {
    const navItems = [
      { id: 'todo',     icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>', label: '待办事项', badge: 'todo' },
      { id: 'inbox',    icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>', label: '收集箱',   badge: 'inbox' },
      { id: 'chat',     icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>', label: 'AI 助手',  badge: null },
      { id: 'settings', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>', label: '设置',     badge: null }
    ];

    const todoCount = Storage.getTodos().filter(t => !t.completed).length;
    const inboxCount = Storage.getInbox().length;

    const counts = { todo: todoCount, inbox: inboxCount };

    const desktopNav = document.getElementById('desktop-nav');
    const mobileNav  = document.getElementById('mobile-nav');

    const itemHTML = (item, isMobile) => {
      const count = counts[item.badge] || 0;
      const badgeHTML = item.badge && count > 0
        ? `<span class="flex-shrink-0 min-w-[20px] h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center px-1.5 font-medium">${count}</span>`
        : '';
      return `
        <button class="nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-surface-800 transition-all ${this.currentView === item.id ? 'active bg-surface-800 text-gray-100' : ''}"
                data-view="${item.id}" ${isMobile ? 'aria-label="' + item.label + '"' : ''}>
          ${item.icon}
          ${isMobile ? '' : `<span class="flex-1 text-left text-sm font-medium">${item.label}</span>`}
          ${isMobile ? '' : badgeHTML}
        </button>
      `;
    };

    desktopNav.innerHTML = navItems.map(i => itemHTML(i, false)).join('');
    mobileNav.innerHTML  = navItems.map(i => itemHTML(i, true)).join('');

    // Bind nav clicks
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.switchView(btn.dataset.view));
    });
  },

  // --- Switch View ---
  switchView(viewId) {
    this.currentView = viewId;
    // Hide all views
    document.querySelectorAll('[id^="view-"]').forEach(s => s.classList.add('hidden'));
    // Show target view
    const target = document.getElementById('view-' + viewId);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('view-enter');
    }
    // Re-render
    document.getElementById('global-search').value = '';
    document.getElementById('search-clear').classList.add('hidden');
    this.renderNav();
    switch (viewId) {
      case 'todo':     TodoModule.render(); break;
      case 'inbox':    InboxModule.render(); break;
      case 'chat':     ChatModule.render(); break;
      case 'settings': SettingsModule.render(); break;
    }
  },

  // --- Simple Markdown-like Rendering ---
  renderMarkdown(text) {
    if (!text) return '';
    let html = this._escapeHtml(text);
    // Code blocks: ```...```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    // Inline code: `...`
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    // Bold: **...**
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    // Italic: *...*
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // Unordered lists: - item or * item
    html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
    // Numbered lists: 1. item
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    // Line breaks to paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';
    // Clean empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(\s*<br>\s*)+<\/p>/g, '');
    return html;
  },

  // --- Escape HTML ---
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // --- Format timestamp ---
  formatDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)  return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24)  return `${diffHr}小时前`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7)  return `${diffDay}天前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  },

  // --- Generate Unique ID ---
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
};

// ============================================================
// Todo Module
// ============================================================
const TodoModule = {
  // --- Add Todo ---
  add(text, priority = 'medium') {
    if (!text.trim()) return;
    const todos = Storage.getTodos();
    todos.unshift({
      id: UI.uid(),
      text: text.trim(),
      completed: false,
      priority,
      createdAt: Date.now(),
      completedAt: null
    });
    Storage.saveTodos(todos);
    UI.renderNav();
    this.render();
    UI.toast('待办已添加', 'success');
  },

  // --- Toggle Complete ---
  toggle(id) {
    const todos = Storage.getTodos();
    const item = todos.find(t => t.id === id);
    if (item) {
      item.completed = !item.completed;
      item.completedAt = item.completed ? Date.now() : null;
      Storage.saveTodos(todos);
      UI.renderNav();
      this.render();
    }
  },

  // --- Delete Todo ---
  async delete(id) {
    const confirmed = await UI.confirm('删除待办', '确定要删除这条待办事项吗？');
    if (!confirmed) return;
    const todos = Storage.getTodos().filter(t => t.id !== id);
    Storage.saveTodos(todos);
    UI.renderNav();
    this.render();
    UI.toast('待办已删除', 'info');
  },

  // --- Get Filtered Items ---
  getFiltered() {
    const todos = Storage.getTodos();
    const query = (document.getElementById('global-search')?.value || '').toLowerCase().trim();

    let filtered = todos;
    // Priority filter
    if (UI.currentFilter && UI.currentFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === UI.currentFilter);
    }
    // Search filter
    if (query) {
      filtered = filtered.filter(t => t.text.toLowerCase().includes(query));
    }
    // Sort: incomplete first, then by priority weight, then by date
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (!a.completed) return priorityWeight[b.priority] - priorityWeight[a.priority];
      return b.completedAt - a.completedAt;
    });
    return filtered;
  },

  // --- Render ---
  render() {
    const view = document.getElementById('view-todo');
    const items = this.getFiltered();
    const allTodos = Storage.getTodos();
    const activeCount = allTodos.filter(t => !t.completed).length;
    const completedCount = allTodos.filter(t => t.completed).length;

    const priorityBadge = (p) => {
      const map = {
        high:   'bg-red-500/10 text-red-400 border-red-500/30',
        medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        low:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      };
      const label = { high: '高', medium: '中', low: '低' };
      return `<span class="text-xs px-2 py-0.5 rounded-full border ${map[p]} priority-${p}">${label[p]}</span>`;
    };

    view.innerHTML = `
      <div class="max-w-3xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 class="text-2xl font-bold">📋 今日待办</h1>
            <p class="text-sm text-gray-500 mt-1">${activeCount} 项未完成 · ${completedCount} 项已完成</p>
          </div>
          <div class="flex gap-2 flex-wrap">
            ${['all','high','medium','low'].map(f => {
              const label = f === 'all' ? '全部' : {high:'🔴 高',medium:'🟡 中',low:'🟢 低'}[f];
              const active = UI.currentFilter === f;
              return `<button class="filter-btn px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'bg-indigo-600 text-white' : 'bg-surface-800 text-gray-400 hover:text-gray-200 hover:bg-surface-700'}" data-filter="${f}">${label}</button>`;
            }).join('')}
          </div>
        </div>

        <!-- Add Form -->
        <div class="bg-surface-800 border border-surface-700 rounded-2xl p-4 mb-6 card-hover">
          <div class="flex gap-3">
            <input id="todo-input" type="text" placeholder="添加新的待办事项..."
              class="flex-1 bg-surface-900/50 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              maxlength="300">
            <select id="todo-priority"
              class="bg-surface-900/50 border border-surface-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:border-indigo-500 transition-all cursor-pointer">
              <option value="high">🔴 高</option>
              <option value="medium" selected>🟡 中</option>
              <option value="low">🟢 低</option>
            </select>
            <button id="todo-add-btn"
              class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95">
              添加
            </button>
          </div>
        </div>

        <!-- Todo List -->
        <div class="space-y-2" id="todo-list">
          ${items.length === 0 ? `
            <div class="empty-state text-gray-500">
              <div class="text-5xl mb-4">📝</div>
              <p class="text-lg font-medium text-gray-400">还没有待办事项</p>
              <p class="text-sm mt-1">在上方输入框添加一个新的待办吧！</p>
            </div>
          ` : items.map(t => `
            <div class="bg-surface-800 border border-surface-700 rounded-xl p-4 flex items-start gap-3 card-hover animate-fade-in ${t.completed ? 'opacity-60' : ''}">
              <input type="checkbox" class="custom-checkbox mt-0.5" ${t.completed ? 'checked' : ''} data-id="${t.id}">
              <div class="flex-1 min-w-0">
                <span class="text-sm ${t.completed ? 'line-through text-gray-500' : 'text-gray-100'}">${UI._escapeHtml(t.text)}</span>
                <div class="flex items-center gap-2 mt-1.5">
                  ${priorityBadge(t.priority)}
                  <span class="text-xs text-gray-600">${UI.formatDate(t.createdAt)}</span>
                  ${t.completed ? `<span class="text-xs text-emerald-500">已完成</span>` : ''}
                </div>
              </div>
              <button class="delete-todo flex-shrink-0 w-7 h-7 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 flex items-center justify-center transition-colors" data-id="${t.id}" title="删除">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Bind events
    this._bindEvents(view);
  },

  _bindEvents(view) {
    // Add button
    view.querySelector('#todo-add-btn')?.addEventListener('click', () => {
      const input = view.querySelector('#todo-input');
      const select = view.querySelector('#todo-priority');
      this.add(input.value, select.value);
      input.value = '';
      input.focus();
    });
    // Enter key to add
    view.querySelector('#todo-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        view.querySelector('#todo-add-btn')?.click();
      }
    });
    // Toggle checkbox
    view.querySelectorAll('.custom-checkbox').forEach(cb => {
      cb.addEventListener('change', () => this.toggle(cb.dataset.id));
    });
    // Delete buttons
    view.querySelectorAll('.delete-todo').forEach(btn => {
      btn.addEventListener('click', () => this.delete(btn.dataset.id));
    });
    // Filter buttons
    view.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        UI.currentFilter = btn.dataset.filter;
        this.render();
      });
    });
  }
};

// ============================================================
// Inbox Module
// ============================================================
const InboxModule = {
  // --- Add Item ---
  add(content, type = 'note', tags = []) {
    if (!content.trim()) return;
    const inbox = Storage.getInbox();
    inbox.unshift({
      id: UI.uid(),
      content: content.trim(),
      type, // 'text' | 'url' | 'note'
      tags,
      createdAt: Date.now(),
      aiClassified: false,
      aiCategory: null,
      aiTags: []
    });
    Storage.saveInbox(inbox);
    UI.renderNav();
    this.render();
    UI.toast('已添加到收集箱', 'success');
  },

  // --- Delete Item ---
  async delete(id) {
    const confirmed = await UI.confirm('删除笔记', '确定要删除这条收集箱内容吗？');
    if (!confirmed) return;
    const inbox = Storage.getInbox().filter(i => i.id !== id);
    Storage.saveInbox(inbox);
    UI.renderNav();
    this.render();
    UI.toast('笔记已删除', 'info');
  },

  // --- Update Tags ---
  updateTags(id, tags) {
    const inbox = Storage.getInbox();
    const item = inbox.find(i => i.id === id);
    if (item) {
      item.tags = tags;
      Storage.saveInbox(inbox);
      this.render();
    }
  },

  // --- AI Classify ---
  async aiClassify(id) {
    const settings = Storage.getSettings();
    const inbox = Storage.getInbox();
    const item = inbox.find(i => i.id === id);
    if (!item) return;

    const apiKey =
      settings.preferredModel === 'claude' ? settings.claudeKey :
      settings.preferredModel === 'openai' ? settings.openaiKey :
      settings.deepseekKey;
    if (!apiKey) {
      UI.toast('请先在设置中配置 API Key', 'warning');
      return;
    }

    UI.toast('AI 正在分析...', 'info');
    try {
      const systemPrompt = `你是一个知识分类助手。请分析以下用户收集的内容，返回 JSON 格式的分类结果：
{
  "category": "分类名称（如：技术/生活/工作/学习/创意/参考）",
  "tags": ["标签1", "标签2", "标签3"],
  "summary": "一句话总结"
}
只返回 JSON，不要其他文字。`;
      const userMessage = `内容类型：${item.type}\n内容：${item.content}`;

      let response;
      if (settings.preferredModel === 'claude') {
        response = await ChatModule._callClaude([{role:'user', content: userMessage}], apiKey, systemPrompt);
      } else if (settings.preferredModel === 'deepseek') {
        response = await ChatModule._callDeepSeek([{role:'system', content: systemPrompt}, {role:'user', content: userMessage}], apiKey);
      } else {
        response = await ChatModule._callOpenAI([{role:'system', content: systemPrompt}, {role:'user', content: userMessage}], apiKey);
      }

      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        item.aiClassified = true;
        item.aiCategory = result.category || '未分类';
        item.aiTags = result.tags || [];
        if (result.tags && result.tags.length > 0) {
          item.tags = [...new Set([...item.tags, ...result.tags])];
        }
        Storage.saveInbox(inbox);
        this.render();
        UI.toast(`AI 分类完成：${item.aiCategory}`, 'success');
      } else {
        throw new Error('无法解析 AI 响应');
      }
    } catch (e) {
      console.error('AI classify error:', e);
      UI.toast('AI 分类失败：' + e.message, 'error');
    }
  },

  // --- Get Filtered ---
  getFiltered() {
    const inbox = Storage.getInbox();
    const query = (document.getElementById('global-search')?.value || '').toLowerCase().trim();
    if (!query) return inbox;
    return inbox.filter(i =>
      i.content.toLowerCase().includes(query) ||
      i.tags.some(t => t.toLowerCase().includes(query)) ||
      (i.aiCategory && i.aiCategory.toLowerCase().includes(query))
    );
  },

  // --- Render ---
  render() {
    const view = document.getElementById('view-inbox');
    const items = this.getFiltered();

    const typeIcon = { text: '📝', url: '🔗', note: '📄' };
    const typeLabel = { text: '文本', url: '网址', note: '笔记' };

    view.innerHTML = `
      <div class="max-w-3xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 class="text-2xl font-bold">📥 收集箱</h1>
            <p class="text-sm text-gray-500 mt-1">快速记录想法、网址和笔记</p>
          </div>
          <button id="inbox-add-btn-top"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95">
            + 快速添加
          </button>
        </div>

        <!-- Quick Add Form (collapsible) -->
        <div id="inbox-add-form" class="bg-surface-800 border border-surface-700 rounded-2xl p-4 mb-6 hidden card-hover">
          <textarea id="inbox-content" rows="3" placeholder="输入内容、粘贴网址或记录笔记..."
            class="w-full bg-surface-900/50 border border-surface-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"></textarea>
          <div class="flex flex-col sm:flex-row gap-3 mt-3">
            <select id="inbox-type"
              class="bg-surface-900/50 border border-surface-700 rounded-xl px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 transition-all cursor-pointer">
              <option value="note">📄 笔记</option>
              <option value="text">📝 文本</option>
              <option value="url">🔗 网址</option>
            </select>
            <input id="inbox-tags" type="text" placeholder="标签（逗号分隔）"
              class="flex-1 bg-surface-900/50 border border-surface-700 rounded-xl px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all">
            <div class="flex gap-2">
              <button id="inbox-cancel-btn"
                class="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-gray-300 text-sm rounded-xl transition-colors">取消</button>
              <button id="inbox-submit-btn"
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all active:scale-95">保存</button>
            </div>
          </div>
        </div>

        <!-- Items Grid -->
        <div class="space-y-3" id="inbox-list">
          ${items.length === 0 ? `
            <div class="empty-state text-gray-500">
              <div class="text-5xl mb-4">📥</div>
              <p class="text-lg font-medium text-gray-400">收集箱是空的</p>
              <p class="text-sm mt-1">点击"快速添加"按钮记录第一条内容吧！</p>
            </div>
          ` : items.map(item => `
            <div class="bg-surface-800 border border-surface-700 rounded-xl p-4 card-hover animate-fade-in">
              <div class="flex items-start justify-between gap-2 mb-2">
                <span class="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-gray-400">${typeIcon[item.type]} ${typeLabel[item.type]}</span>
                <div class="flex items-center gap-1">
                  ${item.aiClassified ? `<span class="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30" title="AI 已分类">🤖 ${UI._escapeHtml(item.aiCategory || '')}</span>` : ''}
                  <button class="ai-classify-btn w-7 h-7 rounded-lg hover:bg-purple-500/10 text-gray-600 hover:text-purple-400 flex items-center justify-center transition-colors ${!item.aiClassified ? '' : 'opacity-30'}" data-id="${item.id}" title="AI 分类">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                  </button>
                  <button class="delete-inbox w-7 h-7 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 flex items-center justify-center transition-colors" data-id="${item.id}" title="删除">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
              <div class="text-sm text-gray-200 whitespace-pre-wrap break-words">${UI._escapeHtml(item.content)}</div>
              <div class="flex items-center gap-2 mt-3 flex-wrap">
                ${item.tags.map(tag => `
                  <span class="tag-chip inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    #${UI._escapeHtml(tag)}
                    <button class="tag-remove ml-0.5 hover:text-red-400 transition-colors" data-id="${item.id}" data-tag="${UI._escapeHtml(tag)}">×</button>
                  </span>
                `).join('')}
                ${item.tags.length === 0 ? '<span class="text-xs text-gray-600">无标签</span>' : ''}
                <span class="text-xs text-gray-600 ml-auto">${UI.formatDate(item.createdAt)}</span>
              </div>
              ${item.aiTags && item.aiTags.length > 0 ? `
                <div class="mt-2 pt-2 border-t border-surface-700">
                  <span class="text-xs text-gray-500">AI 建议标签：</span>
                  ${item.aiTags.map(t => `<span class="text-xs text-purple-400">#${UI._escapeHtml(t)}</span>`).join(' ')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this._bindEvents(view);
  },

  _bindEvents(view) {
    // Toggle add form
    const form = view.querySelector('#inbox-add-form');
    view.querySelector('#inbox-add-btn-top')?.addEventListener('click', () => {
      form.classList.toggle('hidden');
      if (!form.classList.contains('hidden')) {
        form.querySelector('#inbox-content')?.focus();
      }
    });
    view.querySelector('#inbox-cancel-btn')?.addEventListener('click', () => form.classList.add('hidden'));

    // Submit
    view.querySelector('#inbox-submit-btn')?.addEventListener('click', () => {
      const content = view.querySelector('#inbox-content').value;
      const type = view.querySelector('#inbox-type').value;
      const tags = view.querySelector('#inbox-tags').value.split(',').map(s => s.trim()).filter(Boolean);
      this.add(content, type, tags);
      view.querySelector('#inbox-content').value = '';
      view.querySelector('#inbox-tags').value = '';
      form.classList.add('hidden');
    });

    // Delete buttons
    view.querySelectorAll('.delete-inbox').forEach(btn => {
      btn.addEventListener('click', () => this.delete(btn.dataset.id));
    });

    // AI classify buttons
    view.querySelectorAll('.ai-classify-btn').forEach(btn => {
      btn.addEventListener('click', () => this.aiClassify(btn.dataset.id));
    });

    // Tag remove
    view.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const tag = btn.dataset.tag;
        const inbox = Storage.getInbox();
        const item = inbox.find(i => i.id === id);
        if (item) {
          item.tags = item.tags.filter(t => t !== tag);
          Storage.saveInbox(inbox);
          this.render();
        }
      });
    });
  }
};

// ============================================================
// Chat Module — AI 助手
// ============================================================
const ChatModule = {
  // --- API Call: Claude ---
  async _callClaude(messages, apiKey, systemPrompt) {
    const systemMessages = messages.filter(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');
    // Compose system prompt
    const fullSystem = [
      systemPrompt || '',
      ...systemMessages.map(m => m.content)
    ].filter(Boolean).join('\n\n');

    const body = {
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      messages: chatMessages.map(m => ({ role: m.role, content: m.content }))
    };
    // Claude requires system at top level, but sonnet-5 might support system in messages
    // Let's use top-level system for compatibility
    if (fullSystem) body.system = fullSystem;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `Claude API 错误 (${resp.status})`);
    }
    const data = await resp.json();
    // Extract text from content blocks
    const textBlocks = data.content.filter(c => c.type === 'text');
    return textBlocks.map(c => c.text).join('\n');
  },

  // --- API Call: OpenAI ---
  async _callOpenAI(messages, apiKey) {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API 错误 (${resp.status})`);
    }
    const data = await resp.json();
    return data.choices[0].message.content;
  },

  // --- API Call: DeepSeek (OpenAI-compatible) ---
  async _callDeepSeek(messages, apiKey) {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `DeepSeek API 错误 (${resp.status})`);
    }
    const data = await resp.json();
    return data.choices[0].message.content;
  },

  // --- Send Message ---
  async send(userMessage) {
    const settings = Storage.getSettings();
    const apiKey =
      settings.preferredModel === 'claude' ? settings.claudeKey :
      settings.preferredModel === 'openai' ? settings.openaiKey :
      settings.deepseekKey;

    if (!apiKey) {
      UI.toast('请先在设置中配置 API Key', 'warning');
      SettingsModule.render(); // Switch to settings
      UI.switchView('settings');
      return;
    }

    if (!userMessage.trim()) return;

    // Add user message to history
    const history = Storage.getChatHistory();
    history.push({ id: UI.uid(), role: 'user', content: userMessage.trim(), timestamp: Date.now() });

    // Build context from knowledge base
    const todos = Storage.getTodos();
    const inbox = Storage.getInbox();
    const kbContext = [];
    if (todos.length > 0) {
      const activeTodos = todos.filter(t => !t.completed).slice(0, 10);
      if (activeTodos.length > 0) {
        kbContext.push('## 当前待办事项');
        activeTodos.forEach(t => kbContext.push(`- [${t.priority}] ${t.completed ? '✅' : '⬜'} ${t.text}`));
      }
    }
    if (inbox.length > 0) {
      const recentInbox = inbox.slice(0, 10);
      kbContext.push('\n## 收集箱最近内容');
      recentInbox.forEach(i => kbContext.push(`- [${i.type}] ${i.content.slice(0, 200)}`));
    }

    const systemPrompt = `你是用户的 AI 知识库助手。你可以访问用户的知识库数据（待办事项和收集箱内容），帮助用户分析文档、总结内容、检索信息和提供建议。

${kbContext.length > 0 ? '以下是用户当前知识库的部分内容：\n' + kbContext.join('\n') : ''}

请用中文回复，保持简洁有帮助。`;

    // Build messages for API
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-20).map(m => ({ role: m.role, content: m.content })) // last 20 messages
    ];

    // Render immediately to show user message + loading
    this.render();

    try {
      let response;
      if (settings.preferredModel === 'claude') {
        response = await this._callClaude(apiMessages, apiKey); // system prompt already in apiMessages
      } else if (settings.preferredModel === 'deepseek') {
        response = await this._callDeepSeek(apiMessages, apiKey);
      } else {
        response = await this._callOpenAI(apiMessages, apiKey);
      }

      // Add assistant response to history
      history.push({ id: UI.uid(), role: 'assistant', content: response, timestamp: Date.now() });
      Storage.saveChatHistory(history);
      this.render();
    } catch (e) {
      console.error('Chat error:', e);
      // Remove the failed user message
      const idx = history.findIndex(m => m.id === history[history.length - 1]?.id && m.role === 'user');
      // Actually, keep the user message but add an error message
      history.push({ id: UI.uid(), role: 'assistant', content: `❌ **错误**：${e.message}`, timestamp: Date.now(), isError: true });
      Storage.saveChatHistory(history);
      this.render();
      UI.toast('AI 请求失败：' + e.message, 'error');
    }
  },

  // --- Clear History ---
  async clearHistory() {
    const confirmed = await UI.confirm('清除对话', '确定要清除所有对话历史吗？此操作不可撤销。');
    if (!confirmed) return;
    Storage.saveChatHistory([]);
    this.render();
    UI.toast('对话历史已清除', 'info');
  },

  // --- Render ---
  render() {
    const view = document.getElementById('view-chat');
    const history = Storage.getChatHistory();
    const settings = Storage.getSettings();
    const modelKeys = { claude: settings.claudeKey, openai: settings.openaiKey, deepseek: settings.deepseekKey };
    const hasApiKey = !!(modelKeys[settings.preferredModel] || '');
    const modelNames = { claude: 'Claude Sonnet 5', openai: 'GPT-4o', deepseek: 'DeepSeek V3' };
    const isCurrentlyLoading = history.length > 0 && history[history.length - 1].role === 'user';

    view.innerHTML = `
      <!-- Chat Header -->
      <div class="flex-shrink-0 px-4 md:px-6 py-3 bg-surface-900/80 border-b border-surface-800 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm">AI</div>
          <div>
            <h2 class="text-sm font-semibold">AI 知识库助手</h2>
            <p class="text-xs ${hasApiKey ? 'text-emerald-500' : 'text-amber-500'}">
              ${hasApiKey ? '● API 已连接' : '○ 未配置 API Key'}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 hidden sm:inline">${modelNames[settings.preferredModel] || settings.preferredModel}</span>
          ${history.length > 0 ? `
            <button id="chat-clear-btn" class="text-xs px-3 py-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-400 hover:text-gray-200 transition-colors">
              清除对话
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4 md:p-6" id="chat-messages">
        ${history.length === 0 ? `
          <div class="empty-state text-gray-500 h-full">
            <div class="text-5xl mb-4">🤖</div>
            <p class="text-lg font-medium text-gray-400">AI 知识库助手</p>
            <p class="text-sm mt-1 mb-6">我可以帮你分析文档、总结内容、检索知识和回答问题</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
              ${[
                '总结收集箱里的所有内容',
                '帮我分析待办事项的优先级',
                '根据我的笔记，给出学习建议',
                '搜索关于"项目"的所有内容'
              ].map(suggestion => `
                <button class="chat-suggestion text-left text-xs p-3 rounded-xl bg-surface-800 border border-surface-700 hover:border-indigo-500/30 hover:bg-surface-750 text-gray-400 hover:text-gray-200 transition-all">
                  💡 ${suggestion}
                </button>
              `).join('')}
            </div>
            ${!hasApiKey ? `
              <div class="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 max-w-md">
                <p class="text-sm text-amber-400">⚠️ 请先在「设置」页面配置 API Key（支持 DeepSeek、OpenAI 和 Claude API）</p>
              </div>
            ` : ''}
          </div>
        ` : history.map((msg, idx) => {
          const isLast = idx === history.length - 1;
          const isLoading = isLast && msg.role === 'user' && isCurrentlyLoading;
          if (msg.role === 'user') {
            return `
              <div class="flex justify-end mb-4 chat-msg-enter">
                <div class="max-w-[80%] sm:max-w-[70%] bg-indigo-600 rounded-2xl rounded-br-md px-4 py-2.5">
                  <p class="text-sm text-white whitespace-pre-wrap">${UI._escapeHtml(msg.content)}</p>
                  <p class="text-xs text-indigo-300 mt-1">${UI.formatDate(msg.timestamp)}</p>
                </div>
              </div>
            `;
          } else {
            return `
              <div class="flex justify-start mb-4 chat-msg-enter">
                <div class="max-w-[80%] sm:max-w-[70%] bg-surface-800 border border-surface-700 rounded-2xl rounded-bl-md px-4 py-2.5 ${msg.isError ? 'border-red-500/30 bg-red-500/5' : ''}">
                  <div class="text-sm text-gray-200 chat-content">${UI.renderMarkdown(msg.content)}</div>
                  <p class="text-xs text-gray-600 mt-1">${UI.formatDate(msg.timestamp)}</p>
                </div>
              </div>
            `;
          }
        }).join('')}
        ${isCurrentlyLoading ? `
          <div class="flex justify-start mb-4 chat-msg-enter">
            <div class="bg-surface-800 border border-surface-700 rounded-2xl rounded-bl-md px-4 py-3">
              <div class="thinking-dots flex gap-1">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Input Area -->
      <div class="flex-shrink-0 p-3 md:p-4 bg-surface-900/80 border-t border-surface-800">
        <div class="max-w-3xl mx-auto flex gap-3">
          <textarea id="chat-input" rows="1" placeholder="输入消息... (Shift+Enter 换行)"
            class="flex-1 bg-surface-800 border border-surface-700 rounded-2xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
            style="max-height: 120px;"></textarea>
          <button id="chat-send-btn"
            class="flex-shrink-0 w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center justify-center transition-all hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            ${!hasApiKey ? 'disabled' : ''}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
          </button>
        </div>
        <p class="text-xs text-gray-600 text-center mt-2">回答由 AI 生成，请核实重要信息。数据仅存储于本地浏览器。</p>
      </div>
    `;

    this._bindEvents(view);
    // Scroll to bottom
    setTimeout(() => {
      const msgContainer = view.querySelector('#chat-messages');
      if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
    }, 100);
  },

  _bindEvents(view) {
    const input = view.querySelector('#chat-input');
    const sendBtn = view.querySelector('#chat-send-btn');

    const doSend = () => {
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      input.style.height = 'auto';
      this.send(msg);
    };

    sendBtn?.addEventListener('click', doSend);

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        doSend();
      }
    });

    // Auto-resize textarea
    input?.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Clear button
    view.querySelector('#chat-clear-btn')?.addEventListener('click', () => this.clearHistory());

    // Suggestions
    view.querySelectorAll('.chat-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.textContent.replace('💡 ', '').trim();
        doSend();
      });
    });
  }
};

// ============================================================
// Settings Module
// ============================================================
const SettingsModule = {
  // --- Save API Key ---
  saveKey(provider, key) {
    const settings = Storage.getSettings();
    if (provider === 'openai') settings.openaiKey = key.trim();
    if (provider === 'claude') settings.claudeKey = key.trim();
    if (provider === 'deepseek') settings.deepseekKey = key.trim();
    Storage.saveSettings(settings);
    const names = { openai: 'OpenAI', claude: 'Claude', deepseek: 'DeepSeek' };
    UI.toast(`${names[provider] || provider} API Key 已保存`, 'success');
  },

  // --- Set Preferred Model ---
  setPreferredModel(model) {
    const settings = Storage.getSettings();
    settings.preferredModel = model;
    Storage.saveSettings(settings);
    const names = { claude: 'Claude', openai: 'OpenAI', deepseek: 'DeepSeek' };
    UI.toast(`默认模型已切换为 ${names[model] || model}`, 'info');
    this.render();
  },

  // --- Export Data ---
  exportData() {
    const data = Storage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-knowledge-base-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    UI.toast('数据已导出', 'success');
  },

  // --- Import Data ---
  importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Storage.importAll(data)) {
          UI.toast('数据导入成功！请刷新页面查看', 'success');
          UI.renderNav();
          TodoModule.render();
          InboxModule.render();
        }
      } catch (err) {
        UI.toast('导入失败：文件格式不正确', 'error');
      }
    };
    reader.readAsText(file);
  },

  // --- Clear All Data ---
  async clearAllData() {
    const confirmed = await UI.confirm('清除所有数据', '此操作将删除所有待办事项、收集箱内容和对话历史。此操作不可撤销！\n\n建议先导出备份。');
    if (!confirmed) return;
    Storage.clearAll();
    UI.renderNav();
    TodoModule.render();
    InboxModule.render();
    ChatModule.render();
    UI.toast('所有数据已清除', 'warning');
  },

  // --- Render ---
  render() {
    const view = document.getElementById('view-settings');
    const settings = Storage.getSettings();
    const maskKey = (key) => key ? key.slice(0, 8) + '••••••••••••••••' + key.slice(-4) : '';

    view.innerHTML = `
      <div class="max-w-2xl mx-auto">
        <h1 class="text-2xl font-bold mb-6">⚙️ 设置</h1>

        <!-- API Configuration -->
        <div class="bg-surface-800 border border-surface-700 rounded-2xl p-5 mb-6">
          <h2 class="text-lg font-semibold mb-1">🔑 API 配置</h2>
          <p class="text-sm text-gray-500 mb-4">配置 AI 模型 API Key，支持 DeepSeek、OpenAI 和 Claude API</p>

          <!-- Model Preference -->
          <div class="mb-4">
            <label class="text-sm font-medium text-gray-300 mb-2 block">默认模型</label>
            <div class="flex gap-2 flex-wrap">
              <button class="model-choice px-4 py-2 rounded-xl text-sm font-medium transition-all ${settings.preferredModel === 'deepseek' ? 'bg-indigo-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-gray-200'}" data-model="deepseek">
                🐋 DeepSeek (V3)
              </button>
              <button class="model-choice px-4 py-2 rounded-xl text-sm font-medium transition-all ${settings.preferredModel === 'claude' ? 'bg-indigo-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-gray-200'}" data-model="claude">
                🤖 Claude (Anthropic)
              </button>
              <button class="model-choice px-4 py-2 rounded-xl text-sm font-medium transition-all ${settings.preferredModel === 'openai' ? 'bg-indigo-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-gray-200'}" data-model="openai">
                🧠 OpenAI (GPT-4o)
              </button>
            </div>
          </div>

          <!-- DeepSeek Key -->
          <div class="mb-4">
            <label class="text-sm font-medium text-gray-300 mb-2 block">DeepSeek API Key</label>
            <div class="flex gap-2">
              <input type="password" id="deepseek-key-input" placeholder="sk-..."
                class="api-key flex-1 bg-surface-900/50 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all">
              <button id="deepseek-key-save" class="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-gray-300 text-sm rounded-xl transition-colors">保存</button>
            </div>
            ${settings.deepseekKey ? `<p class="text-xs text-emerald-500 mt-1.5">✅ 已配置：${maskKey(settings.deepseekKey)}</p>` : '<p class="text-xs text-gray-600 mt-1.5">获取地址：platform.deepseek.com</p>'}
          </div>

          <!-- Claude Key -->
          <div class="mb-4">
            <label class="text-sm font-medium text-gray-300 mb-2 block">Claude API Key</label>
            <div class="flex gap-2">
              <input type="password" id="claude-key-input" placeholder="sk-ant-api03-..."
                class="api-key flex-1 bg-surface-900/50 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all">
              <button id="claude-key-save" class="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-gray-300 text-sm rounded-xl transition-colors">保存</button>
            </div>
            ${settings.claudeKey ? `<p class="text-xs text-emerald-500 mt-1.5">✅ 已配置：${maskKey(settings.claudeKey)}</p>` : '<p class="text-xs text-gray-600 mt-1.5">获取地址：console.anthropic.com</p>'}
          </div>

          <!-- OpenAI Key -->
          <div class="mb-4">
            <label class="text-sm font-medium text-gray-300 mb-2 block">OpenAI API Key</label>
            <div class="flex gap-2">
              <input type="password" id="openai-key-input" placeholder="sk-..."
                class="api-key flex-1 bg-surface-900/50 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all">
              <button id="openai-key-save" class="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-gray-300 text-sm rounded-xl transition-colors">保存</button>
            </div>
            ${settings.openaiKey ? `<p class="text-xs text-emerald-500 mt-1.5">✅ 已配置：${maskKey(settings.openaiKey)}</p>` : '<p class="text-xs text-gray-600 mt-1.5">获取地址：platform.openai.com</p>'}
          </div>
        </div>

        <!-- PIN Lock -->
        <div class="bg-surface-800 border border-surface-700 rounded-2xl p-5 mb-6">
          <h2 class="text-lg font-semibold mb-1">🔒 访问锁</h2>
          <p class="text-sm text-gray-500 mb-4">设置 PIN 码后，每次打开页面需输入密码才能访问</p>
          ${settings.lockPinHash ? `
            <div class="flex items-center gap-3 mb-4">
              <span class="text-sm text-emerald-400">✅ PIN 码已启用</span>
            </div>
            <div class="flex flex-wrap gap-3">
              <div class="flex gap-2 flex-1 min-w-[200px]">
                <input type="password" id="new-pin-input" placeholder="新 PIN 码（4-6 位数字）"
                  class="flex-1 bg-surface-900/50 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  maxlength="6" inputmode="numeric" pattern="[0-9]*">
                <button id="change-pin-btn" class="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-gray-300 text-sm rounded-xl transition-colors whitespace-nowrap">修改</button>
              </div>
              <button id="remove-pin-btn" class="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-xl transition-colors border border-red-500/20">关闭 PIN 锁</button>
            </div>
          ` : `
            <div class="flex items-center gap-3 mb-4">
              <span class="text-sm text-gray-500">○ 未设置 PIN 码</span>
            </div>
            <div class="flex gap-2 max-w-xs">
              <input type="password" id="set-pin-input" placeholder="设置 4-6 位数字 PIN 码"
                class="flex-1 bg-surface-900/50 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                maxlength="6" inputmode="numeric" pattern="[0-9]*">
              <button id="set-pin-btn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all active:scale-95 whitespace-nowrap">启用</button>
            </div>
          `}
          <p class="text-xs text-gray-600 mt-3">PIN 码使用 SHA-256 哈希存储，仅用于页面访问保护。忘记 PIN 码可在浏览器控制台执行 <code class="text-indigo-400">localStorage.removeItem("ai_kb_settings")</code> 后刷新页面。</p>
        </div>

        <!-- Sync -->
        <div class="bg-surface-800 border border-surface-700 rounded-2xl p-5 mb-6">
          <h2 class="text-lg font-semibold mb-1">🔄 多端同步</h2>
          <p class="text-sm text-gray-500 mb-4">通过 GitHub Gist 自动同步数据，电脑和手机数据保持一致</p>
          ${settings.syncEnabled ? `
            <div class="flex items-center gap-3 mb-4">
              <span class="text-sm" id="sync-status-text">${SyncModule.statusText()}</span>
              <button id="sync-pull-btn" class="text-xs px-3 py-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-300 transition-colors">立即同步</button>
            </div>
            <div class="flex gap-2 flex-wrap">
              <button id="sync-disable-btn" class="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-xl transition-colors border border-red-500/20">关闭同步</button>
            </div>
          ` : `
            <div class="flex items-center gap-3 mb-4">
              <span class="text-sm text-gray-500">○ 未开启同步</span>
            </div>
            <p class="text-xs text-gray-500 mb-3">1. 打开 <a href="https://github.com/settings/tokens" target="_blank" class="text-indigo-400 underline">github.com/settings/tokens</a> → Generate new token (classic) → 勾选 <strong>gist</strong> 权限 → 生成后粘贴到下方</p>
            <div class="flex gap-2 max-w-md mb-3">
              <input type="password" id="sync-token-input" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                class="flex-1 bg-surface-900/50 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all">
              <button id="sync-enable-btn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all active:scale-95 whitespace-nowrap">开启同步</button>
            </div>
          `}
          <p class="text-xs text-gray-600 mt-3">同步基于私有 GitHub Gist，数据仅你和授权的 Token 可访问。自动同步在数据变更后触发。</p>
        </div>

        <!-- Data Management -->
        <div class="bg-surface-800 border border-surface-700 rounded-2xl p-5 mb-6">
          <h2 class="text-lg font-semibold mb-1">💾 数据管理</h2>
          <p class="text-sm text-gray-500 mb-4">所有数据存储在浏览器本地，请定期导出备份</p>
          <div class="flex flex-wrap gap-3">
            <button id="export-data-btn" class="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-gray-300 text-sm rounded-xl transition-colors flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              导出数据 (JSON)
            </button>
            <label class="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-gray-300 text-sm rounded-xl transition-colors cursor-pointer flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              导入数据
              <input type="file" id="import-data-input" accept=".json" class="hidden">
            </label>
            <button id="clear-data-btn" class="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-xl transition-colors border border-red-500/20">
              🗑 清除所有数据
            </button>
          </div>
        </div>

        <!-- Help -->
        <div class="bg-surface-800 border border-surface-700 rounded-2xl p-5 mb-6">
          <h2 class="text-lg font-semibold mb-1">📖 使用说明</h2>
          <div class="text-sm text-gray-400 space-y-3 mt-4">
            <div>
              <h3 class="font-medium text-gray-200">📋 待办事项</h3>
              <p>添加、完成和删除待办事项。支持高/中/低三级优先级分类筛选。Ctrl+K 快速搜索。</p>
            </div>
            <div>
              <h3 class="font-medium text-gray-200">📥 收集箱</h3>
              <p>快速存放文本、网址或笔记。支持自定义标签和 AI 自动分类（需配置 API Key）。</p>
            </div>
            <div>
              <h3 class="font-medium text-gray-200">🤖 AI 助手</h3>
              <p>基于知识库内容的智能对话。AI 可以分析你的待办和笔记，提供总结和建议。支持 DeepSeek、OpenAI 和 Claude API。</p>
            </div>
            <div>
              <h3 class="font-medium text-gray-200">🔍 全局搜索</h3>
              <p>顶部搜索框实时过滤当前视图内容。支持搜索待办事项文本和收集箱内容及标签。</p>
            </div>
            <div class="pt-2 border-t border-surface-700">
              <h3 class="font-medium text-gray-200">⌨️ 快捷键</h3>
              <div class="grid grid-cols-2 gap-2 mt-1">
                <span><kbd class="px-1.5 py-0.5 rounded bg-surface-700 text-xs">Ctrl+K</kbd> 全局搜索</span>
                <span><kbd class="px-1.5 py-0.5 rounded bg-surface-700 text-xs">Enter</kbd> 发送消息</span>
                <span><kbd class="px-1.5 py-0.5 rounded bg-surface-700 text-xs">Shift+Enter</kbd> 换行</span>
                <span><kbd class="px-1.5 py-0.5 rounded bg-surface-700 text-xs">Esc</kbd> 关闭弹窗</span>
              </div>
            </div>
            <div class="pt-2 border-t border-surface-700">
              <h3 class="font-medium text-gray-200">🔒 隐私说明</h3>
              <p>所有数据（包括 API Key）仅存储在浏览器 localStorage 中，不会上传到任何服务器。AI API 调用直接从前端发送到 OpenAI/Anthropic 官方接口。</p>
            </div>
          </div>
        </div>
      </div>
    `;

    this._bindEvents(view);
  },

  _bindEvents(view) {
    // Model choice buttons
    view.querySelectorAll('.model-choice').forEach(btn => {
      btn.addEventListener('click', () => this.setPreferredModel(btn.dataset.model));
    });

    // Save DeepSeek key
    view.querySelector('#deepseek-key-save')?.addEventListener('click', () => {
      const key = view.querySelector('#deepseek-key-input').value;
      if (key) this.saveKey('deepseek', key);
      view.querySelector('#deepseek-key-input').value = '';
    });

    // Save Claude key
    view.querySelector('#claude-key-save')?.addEventListener('click', () => {
      const key = view.querySelector('#claude-key-input').value;
      if (key) this.saveKey('claude', key);
      view.querySelector('#claude-key-input').value = '';
    });

    // Save OpenAI key
    view.querySelector('#openai-key-save')?.addEventListener('click', () => {
      const key = view.querySelector('#openai-key-input').value;
      if (key) this.saveKey('openai', key);
      view.querySelector('#openai-key-input').value = '';
    });

    // PIN: Set
    view.querySelector('#set-pin-btn')?.addEventListener('click', async () => {
      const pin = view.querySelector('#set-pin-input').value;
      const ok = await LockScreen.setPin(pin);
      if (ok) {
        UI.toast('PIN 码已设置，下次打开页面时将需要输入', 'success');
        this.render();
      } else {
        UI.toast('PIN 码需为 4-6 位数字', 'warning');
      }
    });

    // PIN: Change
    view.querySelector('#change-pin-btn')?.addEventListener('click', async () => {
      const pin = view.querySelector('#new-pin-input').value;
      const ok = await LockScreen.setPin(pin);
      if (ok) {
        UI.toast('PIN 码已更新', 'success');
        this.render();
      } else {
        UI.toast('PIN 码需为 4-6 位数字', 'warning');
      }
    });

    // PIN: Remove
    view.querySelector('#remove-pin-btn')?.addEventListener('click', async () => {
      const confirmed = await UI.confirm('关闭 PIN 锁', '确定要移除 PIN 码保护吗？任何人都可以直接访问工作台。');
      if (confirmed) {
        await LockScreen.setPin('');
        UI.toast('PIN 锁已关闭', 'info');
        this.render();
      }
    });

    // Sync: Enable
    view.querySelector('#sync-enable-btn')?.addEventListener('click', async () => {
      const token = view.querySelector('#sync-token-input').value;
      const ok = await SyncModule.enable(token);
      if (ok) {
        UI.toast('同步已开启，数据已合并', 'success');
        this.render();
      } else {
        UI.toast('GitHub Token 格式不正确', 'warning');
      }
    });

    // Sync: Disable
    view.querySelector('#sync-disable-btn')?.addEventListener('click', () => {
      SyncModule.disable();
      UI.toast('同步已关闭', 'info');
      this.render();
    });

    // Sync: Manual pull
    view.querySelector('#sync-pull-btn')?.addEventListener('click', async () => {
      await SyncModule.pull();
      this.render();
      UI.renderNav();
      TodoModule.render();
      InboxModule.render();
      ChatModule.render();
    });

    // Export
    view.querySelector('#export-data-btn')?.addEventListener('click', () => this.exportData());

    // Import
    view.querySelector('#import-data-input')?.addEventListener('change', (e) => {
      if (e.target.files[0]) this.importData(e.target.files[0]);
    });

    // Clear all
    view.querySelector('#clear-data-btn')?.addEventListener('click', () => this.clearAllData());
  }
};

// ============================================================
// Global Search
// ============================================================
const Search = {
  init() {
    const input = document.getElementById('global-search');
    const clearBtn = document.getElementById('search-clear');

    input?.addEventListener('input', () => {
      const hasValue = input.value.trim().length > 0;
      clearBtn.classList.toggle('hidden', !hasValue);
      // Re-render current view with search filter
      if (UI.currentView === 'todo') TodoModule.render();
      if (UI.currentView === 'inbox') InboxModule.render();
    });

    clearBtn?.addEventListener('click', () => {
      input.value = '';
      clearBtn.classList.add('hidden');
      input.focus();
      if (UI.currentView === 'todo') TodoModule.render();
      if (UI.currentView === 'inbox') InboxModule.render();
    });
  }
};

// ============================================================
// Theme Management
// ============================================================
const Theme = {
  init() {
    const settings = Storage.getSettings();
    this.apply(settings.theme || 'dark');

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      this.apply(next);
      const s = Storage.getSettings();
      s.theme = next;
      Storage.saveSettings(s);
    });
  },

  apply(theme) {
    const html = document.documentElement;
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    if (theme === 'light') {
      html.classList.remove('dark');
      html.classList.add('light');
      sunIcon?.classList.add('hidden');
      moonIcon?.classList.remove('hidden');
    } else {
      html.classList.add('dark');
      html.classList.remove('light');
      sunIcon?.classList.remove('hidden');
      moonIcon?.classList.add('hidden');
    }
  }
};

// ============================================================
// PIN Lock Screen
// ============================================================
const LockScreen = {
  _pin: '',
  _maxDigits: 6,

  // --- Hash PIN with SHA-256 ---
  async _hash(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text + 'ai_kb_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // --- Check if PIN is set and should lock ---
  async shouldLock() {
    const settings = Storage.getSettings();
    if (!settings.lockPinHash) return false;
    if (sessionStorage.getItem('ai_kb_unlocked') === '1') return false;
    return true;
  },

  // --- Show lock screen ---
  async show() {
    const lock = document.getElementById('lock-screen');
    const app   = document.getElementById('app-shell');
    if (!lock) return;

    this._pin = '';
    lock.classList.remove('hidden');
    if (app) app.classList.add('hidden');
    document.getElementById('pin-error')?.classList.add('hidden');
    this._updateDots();
    this._buildKeypad();
  },

  // --- Hide lock screen ---
  hide() {
    const lock = document.getElementById('lock-screen');
    const app   = document.getElementById('app-shell');
    if (lock) lock.classList.add('hidden');
    if (app) app.classList.remove('hidden');
    sessionStorage.setItem('ai_kb_unlocked', '1');
  },

  // --- Build number keypad ---
  _buildKeypad() {
    const pad = document.getElementById('pin-keypad');
    if (!pad) return;
    const numbers = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
    pad.innerHTML = numbers.map(n => {
      if (n === '') return '<div></div>';
      const isDel = n === '⌫';
      return `<button class="h-14 rounded-xl text-lg font-semibold transition-all ${isDel ? 'bg-surface-800 text-gray-400 hover:bg-surface-700 active:bg-surface-600' : 'bg-surface-800 text-gray-200 hover:bg-surface-700 active:bg-surface-600'}" data-key="${n}">${n}</button>`;
    }).join('');

    pad.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (key === '⌫') {
          this._pin = this._pin.slice(0, -1);
        } else {
          if (this._pin.length < this._maxDigits) {
            this._pin += key;
          }
        }
        this._updateDots();
        if (this._pin.length === this._maxDigits) {
          setTimeout(() => this._verify(), 150);
        }
        // Clear error on new input
        document.getElementById('pin-error')?.classList.add('hidden');
        this._clearDotError();
      });
    });
  },

  // --- Update dot indicators ---
  _updateDots() {
    for (let i = 0; i < this._maxDigits; i++) {
      const dot = document.querySelector(`#pin-dots .dot-${i}`);
      if (dot) {
        dot.classList.toggle('pin-dot-filled', i < this._pin.length);
        dot.classList.remove('pin-dot-error');
      }
    }
  },

  // --- Show error shake ---
  _showError() {
    document.getElementById('pin-error')?.classList.remove('hidden');
    document.querySelectorAll('#pin-dots [class*="dot-"]').forEach(d => d.classList.add('pin-dot-error'));
    setTimeout(() => {
      this._pin = '';
      this._updateDots();
      document.querySelectorAll('#pin-dots [class*="dot-"]').forEach(d => d.classList.remove('pin-dot-error'));
    }, 500);
  },

  _clearDotError() {
    document.querySelectorAll('#pin-dots [class*="dot-"]').forEach(d => d.classList.remove('pin-dot-error'));
  },

  // --- Verify PIN ---
  async _verify() {
    const settings = Storage.getSettings();
    const inputHash = await this._hash(this._pin);
    if (inputHash === settings.lockPinHash) {
      this._pin = '';
      this.hide();
    } else {
      this._showError();
    }
  },

  // --- Set/change PIN (called from settings) ---
  async setPin(newPin) {
    const settings = Storage.getSettings();
    if (!newPin) {
      // Remove PIN lock
      delete settings.lockPinHash;
      Storage.saveSettings(settings);
      return true;
    }
    if (newPin.length < 4 || newPin.length > this._maxDigits) {
      return false; // PIN must be 4-6 digits
    }
    settings.lockPinHash = await this._hash(newPin);
    Storage.saveSettings(settings);
    return true;
  },

  init() {
    // Reset button (bottom of lock screen)
    document.getElementById('pin-reset-btn')?.addEventListener('click', () => {
      UI.toast('请在控制台执行: localStorage.removeItem("ai_kb_settings"); location.reload();', 'warning');
    });
  }
};

// ============================================================
// Data Sync — GitHub Gist
// ============================================================
const SyncModule = {
  _gistId: null,       // cached gist ID
  _pushTimer: null,    // debounce timer
  _pulling: false,
  _pushing: false,
  _status: 'idle',     // idle | syncing | error | ok

  // --- Get config from settings ---
  _config() {
    const s = Storage.getSettings();
    return {
      enabled: !!s.syncEnabled,
      token: s.syncToken || '',
      gistId: s.syncGistId || ''
    };
  },

  // --- Save config ---
  _saveConfig(updates) {
    const s = Storage.getSettings();
    Object.assign(s, updates);
    Storage._rawSet('settings', s);
  },

  // --- Status badge ---
  statusText() {
    const map = { idle: '⚪ 待同步', syncing: '🔄 同步中...', ok: '🟢 已同步', error: '🔴 同步失败' };
    return map[this._status] || map.idle;
  },

  // --- Build data payload ---
  _buildPayload() {
    return {
      todos: Storage.getTodos(),
      inbox: Storage.getInbox(),
      chatHistory: Storage.getChatHistory(),
      updatedAt: new Date().toISOString()
    };
  },

  // --- Find or create the sync Gist ---
  async _getOrCreateGist() {
    const cfg = this._config();
    if (cfg.gistId) return cfg.gistId;

    // Create new private gist
    const resp = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: { 'Authorization': `token ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'AI Knowledge Base Sync Data',
        public: false,
        files: { 'ai-kb-data.json': { content: JSON.stringify(this._buildPayload()) } }
      })
    });
    if (!resp.ok) throw new Error('创建 Gist 失败: ' + (await resp.json().catch(()=>({})).message || resp.status));
    const data = await resp.json();
    this._saveConfig({ syncGistId: data.id });
    return data.id;
  },

  // --- Pull data from Gist ---
  async pull() {
    const cfg = this._config();
    if (!cfg.enabled || !cfg.token) return;
    this._pulling = true;
    this._status = 'syncing';
    try {
      const gistId = cfg.gistId;
      if (!gistId) { this._pulling = false; this._status = 'idle'; return; }

      const resp = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: { 'Authorization': `token ${cfg.token}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (!resp.ok) {
        if (resp.status === 404) { this._saveConfig({ syncGistId: '' }); }
        throw new Error('Gist 读取失败');
      }
      const data = await resp.json();
      const file = data.files['ai-kb-data.json'];
      if (!file || !file.content) { this._pulling = false; this._status = 'ok'; return; }

      const remote = JSON.parse(file.content);
      // Merge: remote wins for data, but keep local settings keys
      if (remote.todos) {
        const local = Storage.getTodos();
        const merged = this._mergeArrays(local, remote.todos);
        Storage._rawSet('todos', merged);
      }
      if (remote.inbox) {
        const local = Storage.getInbox();
        const merged = this._mergeArrays(local, remote.inbox);
        Storage._rawSet('inbox', merged);
      }
      if (remote.chatHistory && remote.chatHistory.length > (Storage.getChatHistory() || []).length) {
        Storage._rawSet('chat_history', remote.chatHistory);
      }
      this._status = 'ok';
      UI.toast('数据已同步', 'success');
    } catch (e) {
      console.error('Sync pull error:', e);
      this._status = 'error';
      // Don't toast on every pull failure — it's too noisy
    }
    this._pulling = false;
  },

  // --- Push data to Gist ---
  async push() {
    const cfg = this._config();
    if (!cfg.enabled || !cfg.token || this._pushing) return;
    this._pushing = true;
    this._status = 'syncing';
    try {
      const gistId = await this._getOrCreateGist();
      await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `token ${cfg.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: { 'ai-kb-data.json': { content: JSON.stringify(this._buildPayload()) } }
        })
      });
      this._status = 'ok';
    } catch (e) {
      console.error('Sync push error:', e);
      this._status = 'error';
    }
    this._pushing = false;
  },

  // --- Debounced push (called on data changes) ---
  schedulePush() {
    const cfg = this._config();
    if (!cfg.enabled) return;
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => this.push(), 2000);
  },

  // --- Merge two arrays by id, keep newest version of each item ---
  _mergeArrays(local, remote) {
    const map = new Map();
    for (const item of local) map.set(item.id, item);
    for (const item of remote) {
      const existing = map.get(item.id);
      if (!existing || (item.createdAt && existing.createdAt && item.createdAt >= existing.createdAt)) {
        map.set(item.id, item);
      }
    }
    return [...map.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  // --- Toggle sync on/off ---
  async enable(token) {
    if (!token || token.length < 10) return false;
    this._saveConfig({ syncEnabled: true, syncToken: token.trim() });
    await this.pull(); // Pull immediately
    this.push();       // Then push local changes
    return true;
  },

  disable() {
    clearTimeout(this._pushTimer);
    this._saveConfig({ syncEnabled: false });
    this._status = 'idle';
  },

  // --- Init: pull on app start ---
  async init() {
    const cfg = this._config();
    if (!cfg.enabled || !cfg.token) return;
    await this.pull();
  }
};

// Hook Storage to auto-trigger sync on writes
(function _patchStorage() {
  const origSet = Storage.set.bind(Storage);
  Storage.set = function (key, value) {
    const result = origSet(key, value);
    if (['todos', 'inbox', 'chat_history'].includes(key)) {
      SyncModule.schedulePush();
    }
    return result;
  };

  // Raw set that doesn't trigger sync (for internal use)
  Storage._rawSet = function (key, value) {
    try {
      localStorage.setItem(this._prefix + key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  };
})();

// ============================================================
// Keyboard Shortcuts
// ============================================================
const Shortcuts = {
  init() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    });
  }
};

// ============================================================
// App Initialization
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Init theme (always)
  Theme.init();

  // Init lock screen
  LockScreen.init();

  // Check if locked — show lock screen, wait for unlock
  if (await LockScreen.shouldLock()) {
    await LockScreen.show();
    // App shell stays hidden until LockScreen.hide() is called on correct PIN
  }

  // Init search
  Search.init();

  // Init keyboard shortcuts
  Shortcuts.init();

  // Init sync (pull remote data before rendering)
  await SyncModule.init();

  // Render navigation and default view
  UI.renderNav();
  UI.switchView('todo');

  // Seed demo data if first run
  if (Storage.getTodos().length === 0 && Storage.getInbox().length === 0) {
    const demoTodos = [
      { id: UI.uid(), text: '欢迎使用 AI 知识库工作台 👋', completed: false, priority: 'high', createdAt: Date.now() - 60000, completedAt: null },
      { id: UI.uid(), text: '配置 API Key 以启用 AI 助手功能', completed: false, priority: 'high', createdAt: Date.now() - 120000, completedAt: null },
      { id: UI.uid(), text: '尝试添加一条待办事项', completed: true, priority: 'medium', createdAt: Date.now() - 300000, completedAt: Date.now() - 60000 },
    ];
    const demoInbox = [
      { id: UI.uid(), content: '这是一个示例笔记。你可以在这里快速记录想法、灵感或待处理的信息。', type: 'note', tags: ['示例', '入门'], createdAt: Date.now() - 60000, aiClassified: false, aiCategory: null, aiTags: [] },
      { id: UI.uid(), content: 'https://example.com', type: 'url', tags: ['参考'], createdAt: Date.now() - 300000, aiClassified: false, aiCategory: null, aiTags: [] },
    ];
    Storage.saveTodos(demoTodos);
    Storage.saveInbox(demoInbox);
    UI.renderNav();
    UI.switchView('todo');
    UI.toast('欢迎！已为你创建示例数据 🎉', 'info');
  }

  console.log('🚀 AI 知识库与工作台已就绪');
  console.log('💡 按 Ctrl+K 快速搜索');
  console.log('🔒 所有数据仅存储在本地浏览器中');
});
