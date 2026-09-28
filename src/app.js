import { buildAiHostPrompt } from './features/ai-host.js';
import { recommendGames } from './features/recommend.js';
import {
  chooseRandomInteraction,
  filterInteractions,
  INTERACTION_CATEGORY_LABELS,
  INTERACTION_INTENSITY_LABELS
} from './features/interactions.js';
import {
  buildSubmissionIssueUrl,
  resolveRepository,
  submissionFromFormData,
  validateGameSubmission
} from './features/submission.js';
import { renderSubmissionPage } from './features/submission-view.js';
import {
  loadAppState,
  recordPlayed,
  saveLastPreferences,
  toggleDisliked,
  toggleFavorite
} from './features/storage.js';

const VENUE_LABELS = {
  dorm: '宿舍',
  livingRoom: '客厅',
  restaurant: '餐厅',
  outdoor: '户外',
  bar: '酒吧'
};

const PROP_LABELS = {
  none: '无道具',
  paperPen: '有纸笔',
  cards: '有扑克牌',
  dice: '有骰子'
};

const VIBE_LABELS = {
  icebreaker: '破冰',
  funny: '搞笑',
  thinking: '动脑',
  active: '活跃',
  chat: '聊天'
};

const DEFAULT_PREFERENCES = {
  playerCount: 6,
  venue: 'dorm',
  availableProps: ['none'],
  maxDurationMinutes: 20,
  vibe: 'any',
  familiarity: 'medium',
  useAiHost: false
};

const app = document.querySelector('#app');
const toastElement = document.querySelector('#toast');

const state = {
  games: [],
  interactions: [],
  interactionFilters: {
    category: 'any',
    intensity: 'any'
  },
  selectedInteractionId: null,
  lastInteractionId: null,
  appState: loadAppState(),
  preferences: structuredClone(DEFAULT_PREFERENCES),
  recommendations: [],
  rerollOffset: 0,
  hostGameId: null,
  hostStepIndex: 0,
  timerRemainingSeconds: 0,
  timerId: null,
  timerRunning: false
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return entities[character];
  });
}

function getRoute() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const segments = hash.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { name: 'home' };
  }

  if (segments[0] === 'wizard') {
    return { name: 'wizard' };
  }

  if (segments[0] === 'results') {
    return { name: 'results' };
  }

  if (segments[0] === 'library') {
    return { name: 'library' };
  }

  if (segments[0] === 'interactions') {
    return { name: 'interactions' };
  }

  if (segments[0] === 'submit') {
    return { name: 'submit' };
  }

  if (segments[0] === 'game' && segments[1]) {
    return { name: 'game', id: segments[1] };
  }

  if (segments[0] === 'host' && segments[1]) {
    return { name: 'host', id: segments[1] };
  }

  return { name: 'home' };
}

function navigate(path) {
  const nextHash = `#${path}`;

  if (window.location.hash === nextHash) {
    render();
    return;
  }

  window.location.hash = path;
}

function getGame(gameId) {
  return state.games.find((game) => game.id === gameId) ?? null;
}

function formatDuration(durationMinutes) {
  const [min, max] = durationMinutes;
  return min === max ? `${min} 分钟` : `${min}～${max} 分钟`;
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function showToast(message) {
  toastElement.textContent = message;
  toastElement.classList.add('show');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toastElement.classList.remove('show');
  }, 2200);
}

function clearTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
  }

  state.timerId = null;
  state.timerRunning = false;
}

function synchronizeTimerUI() {
  const display = document.querySelector('#timer-display');
  const toggleButton = document.querySelector('[data-action="toggle-timer"]');

  if (display) {
    display.textContent = formatTime(state.timerRemainingSeconds);
  }

  if (toggleButton) {
    toggleButton.textContent = state.timerRunning ? '暂停计时' : '开始计时';
  }
}

function tickTimer() {
  if (!state.timerRunning) {
    return;
  }

  state.timerRemainingSeconds -= 1;
  synchronizeTimerUI();

  if (state.timerRemainingSeconds <= 0) {
    clearTimer();
    synchronizeTimerUI();
    showToast('时间到，主持人可以决定是否延长。');
  }
}

function toggleTimer() {
  if (state.timerRunning) {
    clearTimer();
    synchronizeTimerUI();
    return;
  }

  if (state.timerRemainingSeconds <= 0) {
    showToast('计时已经结束，先重置计时器。');
    return;
  }

  state.timerRunning = true;
  state.timerId = window.setInterval(tickTimer, 1000);
  synchronizeTimerUI();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
}

function renderTopbar() {
  return `
    <header class="topbar">
      <button class="brand" data-action="navigate" data-route="/">
        <span class="brand-mark">开</span>
        <span>开一局</span>
      </button>
      <nav class="nav-actions" aria-label="主导航">
        <button class="button ghost small" data-action="navigate" data-route="/library">游戏库</button>
        <button class="button ghost small" data-action="navigate" data-route="/interactions">互动库</button>
        <button class="button ghost small" data-action="navigate" data-route="/submit">投稿</button>
        <button class="button primary small" data-action="navigate" data-route="/wizard">开始选择</button>
      </nav>
    </header>
  `;
}

function renderFooter() {
  return `
    <footer class="footer">
      <p>第一版只收录适合宿舍和同学聚会的轻量游戏。AI 主持人指令需要手动复制到豆包等工具中使用。</p>
      <p>默认不包含酒精、危险动作和羞辱性惩罚。</p>
    </footer>
  `;
}

function renderHome() {
  return `
    ${renderTopbar()}
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Dorm party game picker</p>
        <h1>聚会<br />开一局！</h1>
        <p class="hero-purpose">不用再慢慢想慢慢搜游戏玩了</p>
        <p>告诉它人数、场地和想要的气氛。30 秒内得到 3 个方向，选一个就能开局。</p>
        <div class="hero-actions" style="margin-top: 26px;">
          <button class="button primary" data-action="navigate" data-route="/wizard">开始选择游戏</button>
          <button class="button ghost" data-action="navigate" data-route="/library">先看看全部游戏</button>
          <button class="button secondary" data-action="navigate" data-route="/interactions">打开互动挑战库</button>
          <button class="button ghost" data-action="start-bar-mode">酒吧模式</button>
        </div>
        <div class="stat-row">
          <div class="stat"><strong>${state.games.length}</strong><span>当前游戏</span></div>
          <div class="stat"><strong>${state.interactions.length}</strong><span>互动挑战</span></div>
          <div class="stat"><strong>4～12</strong><span>适合聚会人数</span></div>
          <div class="stat"><strong>0</strong><span>后端服务和账号</span></div>
        </div>
      </div>
      <aside class="hero-note">
        <strong>不是游戏大全，而是帮你决定现在玩什么。</strong>
        <span>AI 主持人可选，不默认依赖。有人愿意主持时，直接进入人工主持模式。</span>
        <span>数据保存在浏览器本地，不上传你的聚会偏好。</span>
      </aside>
    </section>
    <section class="section">
      <div class="section-heading">
        <h2 class="section-title">第一版解决三件事</h2>
      </div>
      <div class="feature-grid">
        <article class="feature-card">
          <div class="feature-icon">1</div>
          <h3>快速筛选</h3>
          <p>按人数、模式、道具、时长和氛围过滤，不再翻长文章找游戏。</p>
        </article>
        <article class="feature-card">
          <div class="feature-icon">2</div>
          <h3>三选一</h3>
          <p>每次只给一个稳定选择、一个活跃选择和一个换口味选择，降低决策压力。</p>
        </article>
        <article class="feature-card">
          <div class="feature-icon">3</div>
          <h3>马上开局</h3>
          <p>提供主持人步骤、倒计时，以及可复制到豆包等 AI 工具的主持指令。</p>
        </article>
      </div>
    </section>
    ${renderFooter()}
  `;
}

function renderWizard() {
  const preferences = state.preferences;
  const isBarMode = preferences.venue === 'bar';
  const propValues = ['none', 'paperPen', 'cards', 'dice'];
  const vibeValues = ['icebreaker', 'funny', 'thinking', 'active', 'chat'];

  return `
    ${renderTopbar()}
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Step 1 / 2</p>
          <h1 class="page-title">先说说现在的情况</h1>
          <p>不需要填得很准确。选一个最接近的选项，后面推荐会优先匹配。</p>
        </div>
        <button class="button ghost small" data-action="navigate" data-route="/">返回首页</button>
      </div>
      <form id="preferences-form" class="wizard-form">
        <div class="mode-selector">
          <div class="mode-selector-copy">
            <span class="field-label">选择模式</span>
            <p>酒吧模式会隐藏普通场地，并优先推荐适合卡座的快节奏游戏。</p>
          </div>
          <div class="mode-selector-actions">
            <button class="mode-option ${isBarMode ? '' : 'is-active'}" type="button" data-action="select-party-mode">聚会模式</button>
            <button class="mode-option ${isBarMode ? 'is-active' : ''}" type="button" data-action="select-bar-mode">酒吧模式</button>
          </div>
        </div>
        ${isBarMode ? '<div class="notice bar-mode-notice">喝酒完全可选，不强迫饮酒。饮品挑战默认最多一口，可换水或无酒精饮料，不做连续饮酒。</div>' : ''}
        <div class="field-grid">
          <div class="field">
            <label for="playerCount">现场有多少人？</label>
            <select id="playerCount" name="playerCount">
              <option value="4" ${preferences.playerCount === 4 ? 'selected' : ''}>4 人</option>
              <option value="5" ${preferences.playerCount === 5 ? 'selected' : ''}>5 人</option>
              <option value="6" ${preferences.playerCount === 6 ? 'selected' : ''}>6 人</option>
              <option value="7" ${preferences.playerCount === 7 ? 'selected' : ''}>7 人</option>
              <option value="8" ${preferences.playerCount === 8 ? 'selected' : ''}>8 人</option>
              <option value="9" ${preferences.playerCount === 9 ? 'selected' : ''}>9 人</option>
              <option value="10" ${preferences.playerCount === 10 ? 'selected' : ''}>10 人</option>
              <option value="11" ${preferences.playerCount === 11 ? 'selected' : ''}>11 人</option>
              <option value="12" ${preferences.playerCount === 12 ? 'selected' : ''}>12 人</option>
            </select>
            <p class="field-help">第一版支持 4～12 人。</p>
          </div>
          <div class="field" ${isBarMode ? 'hidden' : ''}>
            <label for="venue">在哪里玩？</label>
            ${isBarMode ? '<input type="hidden" name="venue" value="bar" />' : ''}
            <select id="venue" name="venue" ${isBarMode ? 'disabled' : ''}>
              ${Object.entries(VENUE_LABELS).filter(([value]) => value !== 'bar').map(([value, label]) => `<option value="${value}" ${preferences.venue === value ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="maxDurationMinutes">想玩多久？</label>
            <select id="maxDurationMinutes" name="maxDurationMinutes">
              <option value="10" ${preferences.maxDurationMinutes === 10 ? 'selected' : ''}>10 分钟以内</option>
              <option value="15" ${preferences.maxDurationMinutes === 15 ? 'selected' : ''}>15 分钟以内</option>
              <option value="20" ${preferences.maxDurationMinutes === 20 ? 'selected' : ''}>20 分钟以内</option>
              <option value="30" ${preferences.maxDurationMinutes === 30 ? 'selected' : ''}>30 分钟以内</option>
              <option value="999" ${preferences.maxDurationMinutes === 999 ? 'selected' : ''}>不限制</option>
            </select>
          </div>
          <div class="field">
            <label for="vibe">想要什么气氛？</label>
            <select id="vibe" name="vibe">
              <option value="any" ${preferences.vibe === 'any' ? 'selected' : ''}>都可以</option>
              ${vibeValues.map((value) => `<option value="${value}" ${preferences.vibe === value ? 'selected' : ''}>${VIBE_LABELS[value]}</option>`).join('')}
            </select>
          </div>

          <div class="field">
            <span class="field-label">谁来主持？</span>
            <label class="check-card">
              <input type="checkbox" name="useAiHost" ${preferences.useAiHost ? 'checked' : ''} />
              <span>需要 AI 主持人指令</span>
            </label>
            <p class="field-help">勾选后，详情页会提供可复制的 AI 主持指令；不勾选时默认显示人工主持步骤。</p>
          </div>
        </div>
        <div class="field">
          <span class="field-label">现场有哪些道具？</span>
          <div class="checkbox-grid">
            ${propValues.map((value) => {
              const checked = preferences.availableProps.includes(value);
              return `
                <label class="check-card">
                  <input type="checkbox" name="availableProps" value="${value}" ${checked ? 'checked' : ''} />
                  <span>${PROP_LABELS[value]}</span>
                </label>
              `;
            }).join('')}
          </div>
          <p class="field-help">“无道具”可以和其他选项一起勾选。没有勾选任何道具时，会默认只推荐无道具游戏。</p>
        </div>
        <div class="inline-actions">
          <button class="button primary" type="submit">生成 3 个推荐</button>
          <button class="button ghost" type="reset">恢复默认</button>
        </div>
      </form>
    </section>
    ${renderFooter()}
  `;
}

function renderResultCard(recommendation) {
  const game = recommendation.game;
  return `
    <article class="game-card">
      <div class="game-card-header">
        <span class="role-badge">${escapeHtml(recommendation.roleLabel)}</span>
        <span class="tag">${escapeHtml(formatDuration(game.durationMinutes))}</span>
      </div>
      <div>
        <h3>${escapeHtml(game.name)}</h3>
        <p>${escapeHtml(game.pitch)}</p>
      </div>
      <div class="game-meta">
        <span class="tag">${game.minPlayers}～${game.maxPlayers} 人</span>
        ${game.vibes.map((vibe) => `<span class="tag">${VIBE_LABELS[vibe] ?? vibe}</span>`).join('')}
        ${game.aiHost.supported ? '<span class="tag">支持 AI 主持指令</span>' : ''}
      </div>
      <p class="reason">推荐原因：${escapeHtml(recommendation.reason)}</p>
      <div class="card-actions">
        <button class="button primary small" data-action="view-game" data-id="${game.id}">查看规则</button>
        <button class="button secondary small" data-action="start-host" data-id="${game.id}">直接开局</button>
      </div>
    </article>
  `;
}

function renderResults() {
  if (state.recommendations.length === 0) {
    return `
      ${renderTopbar()}
      <section class="panel">
        <div class="empty-state">
          <h2>暂时没有合适的游戏</h2>
          <p>可以放宽道具或时长条件，再生成一次推荐。</p>
          <button class="button primary" data-action="navigate" data-route="/wizard">重新选择</button>
        </div>
      </section>
      ${renderFooter()}
    `;
  }

  const preferences = state.preferences;
  return `
    ${renderTopbar()}
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Step 2 / 2</p>
          <h1 class="page-title">给你三个方向</h1>
          <p>先选中一个开始，不要在这里继续纠结。换一批只会重新计算推荐顺序。</p>
        </div>
        <button class="button ghost small" data-action="navigate" data-route="/wizard">修改条件</button>
      </div>
      <div class="summary-row">
        <span class="chip">${preferences.playerCount} 人</span>
        <span class="chip">${preferences.venue === 'bar' ? '酒吧模式 · 喝酒可选' : VENUE_LABELS[preferences.venue] ?? preferences.venue}</span>
        <span class="chip">${preferences.maxDurationMinutes >= 999 ? '不限时长' : `${preferences.maxDurationMinutes} 分钟内`}</span>
        <span class="chip">${preferences.vibe === 'any' ? '氛围不限' : VIBE_LABELS[preferences.vibe]}</span>
        ${preferences.useAiHost ? '<span class="chip">需要 AI 主持指令</span>' : '<span class="chip">人工主持</span>'}
      </div>
      <div class="result-grid" style="margin-top: 22px;">
        ${state.recommendations.map(renderResultCard).join('')}
      </div>
      <div class="inline-actions" style="margin-top: 24px;">
        <button class="button" data-action="reroll">换一批</button>
        <button class="button ghost" data-action="navigate" data-route="/wizard">重新选择条件</button>
      </div>
    </section>
    ${renderFooter()}
  `;
}

function renderLibrary() {
  return `
    ${renderTopbar()}
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Game library</p>
          <h1 class="page-title">全部游戏</h1>
          <p>当前是样板内容。后续每新增一个游戏，都会自动出现在推荐和 AI 指令生成中。</p>
        </div>
        <button class="button primary small" data-action="navigate" data-route="/wizard">按条件推荐</button>
      </div>
      <div class="library-grid">
        ${state.games.map((game) => `
          <article class="game-card library-card">
            <div class="game-card-header">
              <h3>${escapeHtml(game.name)}</h3>
              <span class="tag">${escapeHtml(formatDuration(game.durationMinutes))}</span>
            </div>
            <p>${escapeHtml(game.pitch)}</p>
            <div class="game-meta">
              <span class="tag">${game.minPlayers}～${game.maxPlayers} 人</span>
              ${game.props.map((prop) => `<span class="tag">${PROP_LABELS[prop] ?? prop}</span>`).join('')}
              ${game.aiHost.supported ? '<span class="tag">AI 指令可用</span>' : '<span class="tag">建议人工主持</span>'}
            </div>
            <div class="card-actions">
              <button class="button primary small" data-action="view-game" data-id="${game.id}">查看规则</button>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
    ${renderFooter()}
  `;
}

function renderGameDetail(gameId) {
  const game = getGame(gameId);

  if (!game) {
    return `
      ${renderTopbar()}
      <section class="panel">
        <div class="empty-state">
          <h2>没有找到这个游戏</h2>
          <button class="button primary" data-action="navigate" data-route="/library">返回游戏库</button>
        </div>
      </section>
      ${renderFooter()}
    `;
  }

  const isFavorite = state.appState.favoriteGameIds.includes(game.id);
  const isDisliked = state.appState.dislikedGameIds.includes(game.id);
  const prompt = buildAiHostPrompt(game, state.preferences);

  return `
    ${renderTopbar()}
    <section class="panel">
      <div class="detail-hero">
        <div class="summary-row">
          <span class="chip">${game.minPlayers}～${game.maxPlayers} 人</span>
          <span class="chip">${escapeHtml(formatDuration(game.durationMinutes))}</span>
          <span class="chip">${game.venues.map((venue) => VENUE_LABELS[venue] ?? venue).join(' / ')}</span>
        </div>
        <h1>${escapeHtml(game.name)}</h1>
        <p>${escapeHtml(game.pitch)}</p>
        <div class="game-meta">
          ${game.props.map((prop) => `<span class="tag">${PROP_LABELS[prop] ?? prop}</span>`).join('')}
          ${game.vibes.map((vibe) => `<span class="tag">${VIBE_LABELS[vibe] ?? vibe}</span>`).join('')}
          ${game.aiHost.supported ? '<span class="tag">可生成 AI 主持指令</span>' : '<span class="tag">建议人工主持</span>'}
        </div>
        <div class="card-actions">
          <button class="button primary" data-action="start-host" data-id="${game.id}">开始主持</button>
          <button class="button ${isFavorite ? 'secondary' : 'ghost'}" data-action="toggle-favorite" data-id="${game.id}">
            ${isFavorite ? '已收藏' : '收藏'}
          </button>
          <button class="button ${isDisliked ? 'danger' : 'ghost'}" data-action="toggle-dislike" data-id="${game.id}">
            ${isDisliked ? '已标记不喜欢' : '不喜欢'}
          </button>
        </div>
      </div>
      <div class="detail-grid">
        <div>
          <section class="content-section">
            <h2>怎么玩</h2>
            <ol class="rule-list">
              ${game.rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join('')}
            </ol>
          </section>
          <section class="content-section">
            <h2>主持人步骤</h2>
            <ol class="step-list">
              ${game.hostSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
            </ol>
          </section>
          <section class="content-section">
            <h2>可以怎么变体</h2>
            <ul class="rule-list">
              ${game.variations.map((variation) => `<li>${escapeHtml(variation)}</li>`).join('')}
            </ul>
          </section>
          <section class="content-section">
            <h2>安全边界</h2>
            <ul class="safety-list">
              ${game.safety.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </section>
        </div>
        <aside>
          <div class="panel">
            <p class="eyebrow">Host mode</p>
            <h2>谁来主持？</h2>
            <div class="summary-row">
              <button class="button ${state.preferences.useAiHost ? 'ghost' : 'secondary'} small" data-action="use-human-host" data-id="${game.id}">现场玩家主持</button>
              <button class="button ${state.preferences.useAiHost ? 'primary' : 'ghost'} small" data-action="use-ai-host" data-id="${game.id}" ${game.aiHost.supported ? '' : 'disabled'}>
                ${game.aiHost.supported ? 'AI 主持人指令' : '不支持 AI 主持'}
              </button>
            </div>
            <p class="field-help" style="margin-top: 12px;">AI 模式只会生成一段可复制的指令，不会启动或控制豆包通话。</p>
          </div>
          ${game.aiHost.supported ? `
            <div class="ai-box" style="margin-top: 16px;">
              <h2>复制给豆包或其他 AI 工具</h2>
              <p>点击复制后，打开豆包，粘贴这段指令，再手动开始通话或语音对话。</p>
              <div class="prompt-preview">${escapeHtml(prompt)}</div>
              <div class="inline-actions" style="margin-top: 14px;">
                <button class="button primary small" data-action="copy-prompt" data-id="${game.id}">复制主持人指令</button>
                <button class="button ghost small" data-action="start-host" data-id="${game.id}">先用应用内主持</button>
              </div>
            </div>
          ` : `
            <div class="notice" style="margin-top: 16px;">
              <strong>这个游戏暂不支持 AI 主持。</strong>
              <p>它更适合现场玩家根据动作和表情做判断，建议使用人工主持模式。</p>
            </div>
          `}
        </aside>
      </div>
    </section>
    ${renderFooter()}
  `;
}

function renderHost(gameId) {
  const game = getGame(gameId);

  if (!game) {
    return `
      ${renderTopbar()}
      <section class="panel">
        <div class="empty-state">
          <h2>没有找到这个游戏</h2>
          <button class="button primary" data-action="navigate" data-route="/library">返回游戏库</button>
        </div>
      </section>
    `;
  }

  if (state.hostGameId !== game.id) {
    state.hostGameId = game.id;
    state.hostStepIndex = 0;
    state.timerRemainingSeconds = game.durationMinutes[1] * 60;
    clearTimer();
  }

  const stepIndex = Math.min(state.hostStepIndex, game.hostSteps.length - 1);
  const step = game.hostSteps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === game.hostSteps.length - 1;

  return `
    ${renderTopbar()}
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Host mode</p>
          <h1 class="page-title">${escapeHtml(game.name)}</h1>
          <p>把手机放在桌子中央，主持人按步骤推进。AI 指令可以在游戏详情页随时复制。</p>
        </div>
        <button class="button ghost small" data-action="navigate" data-route="/game/${game.id}">返回详情</button>
      </div>
      <div class="host-layout">
        <section class="host-step">
          <p class="eyebrow">第 ${stepIndex + 1} / ${game.hostSteps.length} 步</p>
          <h1>${escapeHtml(step)}</h1>
          <p>${escapeHtml(game.pitch)}</p>
        </section>
        <aside class="host-panel">
          <section class="timer">
            <p class="eyebrow">本局计时</p>
            <div id="timer-display" class="timer-display">${formatTime(state.timerRemainingSeconds)}</div>
            <div class="host-controls" style="justify-content: center;">
              <button class="button primary" data-action="toggle-timer">${state.timerRunning ? '暂停计时' : '开始计时'}</button>
              <button class="button ghost" data-action="reset-timer">重置</button>
            </div>
          </section>
          <section class="panel">
            <h2>所有主持步骤</h2>
            <ol class="step-list">
              ${game.hostSteps.map((item, index) => `<li style="opacity: ${index === stepIndex ? 1 : 0.68};">${escapeHtml(item)}</li>`).join('')}
            </ol>
          </section>
          <div class="inline-actions">
            <button class="button" data-action="prev-step" ${isFirstStep ? 'disabled' : ''}>上一步</button>
            <button class="button primary" data-action="next-step" ${isLastStep ? 'disabled' : ''}>下一步</button>
            <button class="button danger" data-action="end-host" data-id="${game.id}">结束主持</button>
          </div>
        </aside>
      </div>
    </section>
    ${renderFooter()}
  `;
}

function preferencesFromForm(form) {
  const formData = new FormData(form);
  const playerCount = Number(formData.get('playerCount')) || DEFAULT_PREFERENCES.playerCount;
  const maxDurationMinutes = Number(formData.get('maxDurationMinutes')) || DEFAULT_PREFERENCES.maxDurationMinutes;
  let availableProps = formData.getAll('availableProps');

  if (availableProps.length === 0) {
    availableProps = ['none'];
  } else if (!availableProps.includes('none')) {
    availableProps = ['none', ...availableProps];
  }

  return {
    playerCount: Math.max(4, Math.min(12, Math.round(playerCount))),
    venue: String(formData.get('venue') || DEFAULT_PREFERENCES.venue),
    availableProps,
    maxDurationMinutes,
    vibe: String(formData.get('vibe') || DEFAULT_PREFERENCES.vibe),
    familiarity: DEFAULT_PREFERENCES.familiarity,
    useAiHost: formData.get('useAiHost') === 'on'
  };
}

function handleSubmissionSubmit(event) {
  if (event.target.id !== 'submission-form') {
    return;
  }

  event.preventDefault();
  const submission = submissionFromFormData(new FormData(event.target));
  const errors = validateGameSubmission(submission);
  const errorBox = document.querySelector('#submission-errors');

  if (errors.length > 0) {
    errorBox.hidden = false;
    errorBox.textContent = errors.join('；');
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  errorBox.hidden = true;
  const issueUrl = buildSubmissionIssueUrl(resolveRepository(), submission);
  const issueWindow = window.open(issueUrl, '_blank', 'noopener,noreferrer');

  if (!issueWindow) {
    window.location.href = issueUrl;
  }

  showToast('已打开 GitHub 投稿页面，请确认内容后提交 Issue。');
}

function runRecommendations(excludeIds = []) {
  const preferences = {
    ...state.preferences,
    excludeIds: [...new Set([...state.appState.dislikedGameIds, ...excludeIds])]
  };

  state.recommendations = recommendGames(state.games, preferences);
  return state.recommendations;
}

function handlePreferencesSubmit(event) {
  event.preventDefault();
  const form = event.target;

  if (!(form instanceof HTMLFormElement) || form.id !== 'preferences-form') {
    return;
  }

  state.preferences = preferencesFromForm(form);
  state.appState = saveLastPreferences(state.preferences);
  const recommendations = runRecommendations();

  if (recommendations.length === 0) {
    showToast('没有找到完全匹配的游戏，可以放宽条件再试。');
  }

  navigate('/results');
}

function handleReset() {
  state.preferences = structuredClone(DEFAULT_PREFERENCES);
  state.appState = saveLastPreferences(state.preferences);
  render();
}

async function handleClick(event) {
  const target = event.target.closest('[data-action]');

  if (!target) {
    return;
  }

  const action = target.dataset.action;
  const gameId = target.dataset.id;

  if (action === 'select-bar-mode') {
    state.preferences = {
      ...state.preferences,
      venue: 'bar',
      maxDurationMinutes: 30
    };
    state.appState = saveLastPreferences(state.preferences);
    render();
    return;
  }

  if (action === 'select-party-mode') {
    state.preferences = {
      ...state.preferences,
      venue: state.preferences.venue === 'bar' ? 'dorm' : state.preferences.venue
    };
    state.appState = saveLastPreferences(state.preferences);
    render();
    return;
  }

  if (action === 'start-bar-mode') {
    state.preferences = {
      ...state.preferences,
      venue: 'bar',
      maxDurationMinutes: 30
    };
    state.appState = saveLastPreferences(state.preferences);
    navigate('/wizard');
    return;
  }

  if (action === 'navigate') {
    navigate(target.dataset.route || '/');
    return;
  }

  if (action === 'view-game') {
    navigate(`/game/${gameId}`);
    return;
  }

  if (action === 'start-host') {
    const game = getGame(gameId);

    if (!game) {
      return;
    }

    state.appState = recordPlayed(game.id);
    state.hostGameId = game.id;
    state.hostStepIndex = 0;
    state.timerRemainingSeconds = game.durationMinutes[1] * 60;
    clearTimer();
    navigate(`/host/${game.id}`);
    return;
  }

  if (action === 'next-step') {
    const route = getRoute();
    const game = getGame(route.id);

    if (game) {
      state.hostStepIndex = Math.min(state.hostStepIndex + 1, game.hostSteps.length - 1);
      render();
    }
    return;
  }

  if (action === 'prev-step') {
    state.hostStepIndex = Math.max(0, state.hostStepIndex - 1);
    render();
    return;
  }

  if (action === 'toggle-timer') {
    toggleTimer();
    return;
  }

  if (action === 'reset-timer') {
    const route = getRoute();
    const game = getGame(route.id);

    if (game) {
      clearTimer();
      state.timerRemainingSeconds = game.durationMinutes[1] * 60;
      render();
    }
    return;
  }

  if (action === 'end-host') {
    clearTimer();
    navigate(`/game/${gameId}`);
    return;
  }

  if (action === 'reroll') {
    const currentIds = state.recommendations.map((recommendation) => recommendation.game.id);
    const nextRecommendations = runRecommendations(currentIds);

    if (nextRecommendations.length === 0) {
      state.recommendations = runRecommendations();
      showToast('没有更多不同结果，已重新显示当前可用推荐。');
    }

    render();
    return;
  }

  if (action === 'copy-prompt') {
    const game = getGame(gameId);
    const prompt = game ? buildAiHostPrompt(game, state.preferences) : null;

    if (prompt) {
      await copyText(prompt);
      showToast('AI 主持人指令已复制，可粘贴到豆包中。');
    }
    return;
  }

  if (action === 'toggle-favorite') {
    state.appState = toggleFavorite(gameId);
    render();
    showToast(state.appState.favoriteGameIds.includes(gameId) ? '已加入收藏。' : '已取消收藏。');
    return;
  }

  if (action === 'toggle-dislike') {
    state.appState = toggleDisliked(gameId);
    state.recommendations = state.recommendations.filter((recommendation) => recommendation.game.id !== gameId);
    render();
    showToast(state.appState.dislikedGameIds.includes(gameId) ? '以后推荐会排除这个游戏。' : '已取消不喜欢标记。');
    return;
  }

  if (action === 'set-interaction-category') {
    state.interactionFilters = {
      ...state.interactionFilters,
      category: target.dataset.category || 'any'
    };
    render();
    return;
  }

  if (action === 'set-interaction-intensity') {
    state.interactionFilters = {
      ...state.interactionFilters,
      intensity: target.dataset.intensity || 'any'
    };
    render();
    return;
  }

  if (action === 'random-interaction') {
    const interaction = chooseRandomInteraction(
      state.interactions,
      {
        category: state.interactionFilters.category,
        intensity: state.interactionFilters.intensity,
        availableProps: ['none'],
        lastInteractionId: state.lastInteractionId
      }
    );

    if (!interaction) {
      showToast('当前筛选没有可抽取的互动。');
      return;
    }

    state.selectedInteractionId = interaction.id;
    state.lastInteractionId = interaction.id;
    render();
    return;
  }

  if (action === 'select-interaction') {
    state.selectedInteractionId = gameId;
    state.lastInteractionId = gameId;
    render();
    return;
  }

  if (action === 'clear-interaction') {
    state.selectedInteractionId = null;
    render();
    return;
  }

  if (action === 'use-ai-host') {
    state.preferences = { ...state.preferences, useAiHost: true };
    state.appState = saveLastPreferences(state.preferences);
    render();
    return;
  }

  if (action === 'use-human-host') {
    state.preferences = { ...state.preferences, useAiHost: false };
    state.appState = saveLastPreferences(state.preferences);
    render();
  }
}

async function bootstrap() {
  try {
    const [gamesResponse, interactionsResponse] = await Promise.all([
      fetch('./src/data/games.json'),
      fetch('./src/data/interactions.json')
    ]);

    if (!gamesResponse.ok || !interactionsResponse.ok) {
      throw new Error(`HTTP ${gamesResponse.status}/${interactionsResponse.status}`);
    }

    state.games = await gamesResponse.json();
    state.interactions = await interactionsResponse.json();
    const savedPreferences = state.appState.lastPreferences;

    if (savedPreferences) {
      state.preferences = {
        ...DEFAULT_PREFERENCES,
        ...savedPreferences,
        familiarity: DEFAULT_PREFERENCES.familiarity,
        availableProps: Array.isArray(savedPreferences.availableProps) && savedPreferences.availableProps.length > 0
          ? savedPreferences.availableProps
          : DEFAULT_PREFERENCES.availableProps
      };
    }

    app.addEventListener('click', handleClick);
    app.addEventListener('submit', handlePreferencesSubmit);
    app.addEventListener('submit', handleSubmissionSubmit);
    app.addEventListener('reset', (event) => {
      if (event.target.id === 'preferences-form') {
        event.preventDefault();
        handleReset();
      }
    });
    window.addEventListener('hashchange', render);
    render();
  } catch (error) {
    app.innerHTML = `
      <div class="loading-card">
        <strong>游戏库加载失败。</strong>
        <p>请确认正在通过本地服务器打开页面，而不是直接双击 index.html。</p>
        <pre>${escapeHtml(error.message)}</pre>
      </div>
    `;
  }
}

bootstrap();


function filteredInteractions() {
  return filterInteractions(state.interactions, {
    category: state.interactionFilters.category,
    intensity: state.interactionFilters.intensity,
    availableProps: ['none']
  });
}

function renderInteractionCard(interaction) {
  const isSelected = state.selectedInteractionId === interaction.id;
  return `
    <article class="game-card library-card">
      <div class="game-card-header">
        <h3>${escapeHtml(interaction.title)}</h3>
        <span class="tag">${INTERACTION_CATEGORY_LABELS[interaction.category] ?? interaction.category}</span>
      </div>
      <p>${escapeHtml(interaction.prompt)}</p>
      <div class="game-meta">
        <span class="tag">${INTERACTION_INTENSITY_LABELS[interaction.intensity] ?? '轻松'}</span>
        <span class="tag">约 ${interaction.durationMinutes} 分钟</span>
      </div>
      <p class="reason">安全边界：${escapeHtml(interaction.safety)}</p>
      <div class="card-actions">
        <button class="button ${isSelected ? 'secondary' : 'primary'} small" data-action="select-interaction" data-id="${interaction.id}">
          ${isSelected ? '正在使用' : '使用这个挑战'}
        </button>
      </div>
    </article>
  `;
}

function renderInteractions() {
  const items = filteredInteractions();
  const selected = state.interactions.find((item) => item.id === state.selectedInteractionId) ?? null;
  const categories = ['any', ...Object.keys(INTERACTION_CATEGORY_LABELS)];
  const intensities = ['any', '1', '2', '3'];

  return `
    ${renderTopbar()}
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Interaction library</p>
          <h1 class="page-title">互动挑战库</h1>
          <p>这些内容不是羞辱性惩罚，而是适合破冰和活跃气氛的轻量任务。任何人都可以无理由跳过。</p>
        </div>
        <button class="button primary small" data-action="random-interaction">随机抽一个</button>
      </div>

      <div class="notice">
        <strong>使用原则：</strong>
        <p>不公开隐私、不评价外貌和身材、不做危险动作、不强迫才艺表演。跳过不需要解释。</p>
      </div>

      <div class="content-section">
        <h2>选择类型</h2>
        <div class="summary-row">
          ${categories.map((category) => {
            const label = category === 'any' ? '全部' : INTERACTION_CATEGORY_LABELS[category];
            const active = state.interactionFilters.category === category;
            return `<button class="button ${active ? 'primary' : 'ghost'} small" data-action="set-interaction-category" data-category="${category}">${label}</button>`;
          }).join('')}
        </div>
      </div>

      <div class="content-section">
        <h2>选择强度</h2>
        <div class="summary-row">
          ${intensities.map((intensity) => {
            const label = intensity === 'any' ? '全部' : INTERACTION_INTENSITY_LABELS[intensity];
            const active = state.interactionFilters.intensity === intensity;
            return `<button class="button ${active ? 'primary' : 'ghost'} small" data-action="set-interaction-intensity" data-intensity="${intensity}">${label}</button>`;
          }).join('')}
        </div>
      </div>

      ${selected ? `
        <div class="ai-box" style="margin-top: 22px;">
          <p class="eyebrow">本轮挑战</p>
          <h2>${escapeHtml(selected.title)}</h2>
          <p>${escapeHtml(selected.prompt)}</p>
          <p class="field-help">安全边界：${escapeHtml(selected.safety)}</p>
          <div class="inline-actions" style="margin-top: 14px;">
            <button class="button primary small" data-action="random-interaction">再抽一个</button>
            <button class="button ghost small" data-action="clear-interaction">清空当前挑战</button>
          </div>
        </div>
      ` : ''}

      <div class="section-heading" style="margin-top: 28px;">
        <h2 class="section-title">可选挑战</h2>
        <span class="muted">共 ${items.length} 条</span>
      </div>

      ${items.length > 0 ? `
        <div class="library-grid">
          ${items.map(renderInteractionCard).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <h2>当前筛选没有挑战</h2>
          <p>换一个类型或强度即可。</p>
        </div>
      `}
    </section>
    ${renderFooter()}
  `;
}

function renderSubmission() {
  return renderSubmissionPage({
    topbar: renderTopbar(),
    footer: renderFooter(),
    repository: resolveRepository(),
    escapeHtml
  });
}

function render() {
  const route = getRoute();

  if (route.name !== 'host') {
    clearTimer();
  }

  let content = '';

  if (route.name === 'wizard') {
    content = renderWizard();
  } else if (route.name === 'results') {
    content = renderResults();
  } else if (route.name === 'library') {
    content = renderLibrary();
  } else if (route.name === 'interactions') {
    content = renderInteractions();
  } else if (route.name === 'submit') {
    content = renderSubmission();
  } else if (route.name === 'game') {
    content = renderGameDetail(route.id);
  } else if (route.name === 'host') {
    content = renderHost(route.id);
  } else {
    content = renderHome();
  }

  app.innerHTML = content;
}

