const VENUE_OPTIONS = [
  ['dorm', '宿舍'],
  ['livingRoom', '客厅'],
  ['restaurant', '餐厅'],
  ['outdoor', '户外']
];

const PROP_OPTIONS = [
  ['none', '无道具'],
  ['paperPen', '有纸笔'],
  ['cards', '有扑克牌']
];

const VIBE_OPTIONS = [
  ['icebreaker', '破冰'],
  ['funny', '搞笑'],
  ['thinking', '动脑'],
  ['active', '活跃'],
  ['chat', '聊天']
];

function renderCheckboxes(name, options, checkedValues = []) {
  return options.map(([value, label]) => `
    <label class="check-card">
      <input type="checkbox" name="${name}" value="${value}" ${checkedValues.includes(value) ? 'checked' : ''} />
      <span>${label}</span>
    </label>
  `).join('');
}

export function renderSubmissionPage({ topbar, footer, repository, escapeHtml }) {
  const repositoryName = `${repository.owner}/${repository.repo}`;

  return `
    ${topbar}
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Game submission</p>
          <h1 class="page-title">投稿一个新游戏</h1>
          <p>填写完成后会打开预填好的 GitHub Issue。投稿需要 GitHub 账号，提交后由维护者审核。</p>
        </div>
        <button class="button ghost small" data-action="navigate" data-route="/library">返回游戏库</button>
      </div>

      <div class="notice">
        <strong>投稿要求：</strong>
        <p>只提交原创描述或有权使用的公共玩法，不复制其他网站、商业桌游或付费应用的大段规则。所有内容都会进入人工审核。</p>
      </div>

      <div id="submission-errors" class="notice submission-errors" hidden></div>

      <form id="submission-form" class="wizard-form" style="margin-top: 24px;">
        <div class="field-grid">
          <div class="field">
            <label for="submission-name">游戏名称</label>
            <input id="submission-name" name="name" maxlength="40" placeholder="例如：宿舍默契问答" required />
          </div>
          <div class="field">
            <label for="submission-pitch">一句话介绍</label>
            <input id="submission-pitch" name="pitch" maxlength="120" placeholder="用一句话说明怎么玩" required />
          </div>
          <div class="field">
            <label for="submission-min-players">最少人数</label>
            <input id="submission-min-players" name="minPlayers" type="number" min="2" max="30" value="4" required />
          </div>
          <div class="field">
            <label for="submission-max-players">最多人数</label>
            <input id="submission-max-players" name="maxPlayers" type="number" min="2" max="30" value="12" required />
          </div>
          <div class="field">
            <label for="submission-min-duration">最短时间</label>
            <input id="submission-min-duration" name="minDuration" type="number" min="1" max="120" value="10" required />
          </div>
          <div class="field">
            <label for="submission-max-duration">最长时间</label>
            <input id="submission-max-duration" name="maxDuration" type="number" min="1" max="120" value="20" required />
          </div>
        </div>

        <div class="field">
          <span class="field-label">适合哪些场地？</span>
          <div class="checkbox-grid">
            ${renderCheckboxes('venues', VENUE_OPTIONS, ['dorm', 'livingRoom'])}
          </div>
        </div>

        <div class="field">
          <span class="field-label">需要哪些道具？</span>
          <div class="checkbox-grid">
            ${renderCheckboxes('props', PROP_OPTIONS, ['none'])}
          </div>
        </div>

        <div class="field">
          <span class="field-label">适合什么气氛？</span>
          <div class="checkbox-grid">
            ${renderCheckboxes('vibes', VIBE_OPTIONS, ['funny'])}
          </div>
        </div>

        <div class="field">
          <label class="check-card">
            <input type="checkbox" name="aiHostSupported" checked />
            <span>这个游戏可以生成 AI 主持人指令</span>
          </label>
        </div>

        <div class="field">
          <label for="submission-rules">游戏规则，每行一条，最多 5 条</label>
          <textarea id="submission-rules" name="rules" rows="6" maxlength="620" placeholder="第一位玩家开始...&#10;下一位玩家必须..." required></textarea>
        </div>

        <div class="field">
          <label for="submission-host-steps">主持人步骤，每行一条，2～6 条</label>
          <textarea id="submission-host-steps" name="hostSteps" rows="6" maxlength="740" placeholder="先说明规则&#10;确定发言顺序&#10;每轮结束后换下一位" required></textarea>
        </div>

        <div class="field">
          <label for="submission-variations">可选变体，每行一条</label>
          <textarea id="submission-variations" name="variations" rows="4" maxlength="500" placeholder="可以留空；如果填写，每行一个变体"></textarea>
        </div>

        <div class="field">
          <label for="submission-safety">安全边界，每行一条，最多 5 条</label>
          <textarea id="submission-safety" name="safety" rows="4" maxlength="620" placeholder="不公开隐私&#10;允许玩家无理由跳过" required></textarea>
        </div>

        <div class="field-grid">
          <div class="field">
            <label for="submission-source-type">内容来源</label>
            <select id="submission-source-type" name="sourceType" required>
              <option value="original">原创</option>
              <option value="traditional">传统公共玩法</option>
              <option value="adapted">公共玩法改编</option>
            </select>
          </div>
          <div class="field">
            <label for="submission-source-url">来源链接，可选</label>
            <input id="submission-source-url" name="sourceUrl" type="url" placeholder="https://..." />
          </div>
        </div>

        <label class="check-card">
          <input type="checkbox" name="rightsConfirmed" required />
          <span>我确认规则为原创描述或有权使用，且内容不包含隐私追问、危险动作、酒精强制机制和羞辱性惩罚。</span>
        </label>

        <div class="inline-actions">
          <button class="button primary" type="submit">提交到 GitHub Issue</button>
          <button class="button ghost" type="reset">清空表单</button>
        </div>
        <p class="field-help">提交时会打开 GitHub，并跳转到 ${escapeHtml(repositoryName)} 的新 Issue 页面。</p>
      </form>
    </section>
    ${footer}
  `;
}
