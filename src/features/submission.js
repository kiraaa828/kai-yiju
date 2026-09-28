export const DEFAULT_REPOSITORY = {
  owner: 'kiraaa828',
  repo: 'kai-yiju'
};

const SOURCE_TYPE_LABELS = {
  original: '原创',
  traditional: '传统公共玩法',
  adapted: '公共玩法改编'
};

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

function cleanInline(value) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/@/g, '＠')
    .trim();
}

function formatList(items, ordered = false) {
  return items
    .map((item, index) => `${ordered ? `${index + 1}.` : '-'} ${cleanInline(item)}`)
    .join('\n');
}

function formatLabels(values, labels) {
  return values.map((value) => labels[value] ?? value).map(cleanInline).join('、');
}

function splitLines(value) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function resolveRepository(locationLike = globalThis.location) {
  const hostname = locationLike?.hostname ?? '';
  const segments = (locationLike?.pathname ?? '').split('/').filter(Boolean);

  if (hostname.endsWith('.github.io') && segments.length > 0) {
    return {
      owner: hostname.slice(0, -'.github.io'.length),
      repo: segments[0]
    };
  }

  return { ...DEFAULT_REPOSITORY };
}

export function submissionFromFormData(formData) {
  return {
    name: String(formData.get('name') ?? '').trim(),
    pitch: String(formData.get('pitch') ?? '').trim(),
    minPlayers: Number(formData.get('minPlayers')),
    maxPlayers: Number(formData.get('maxPlayers')),
    minDuration: Number(formData.get('minDuration')),
    maxDuration: Number(formData.get('maxDuration')),
    venues: formData.getAll('venues').map(String),
    props: formData.getAll('props').map(String),
    vibes: formData.getAll('vibes').map(String),
    aiHostSupported: formData.get('aiHostSupported') === 'on',
    rules: splitLines(formData.get('rules')),
    hostSteps: splitLines(formData.get('hostSteps')),
    variations: splitLines(formData.get('variations')),
    safety: splitLines(formData.get('safety')),
    sourceType: String(formData.get('sourceType') ?? ''),
    sourceUrl: String(formData.get('sourceUrl') ?? '').trim(),
    rightsConfirmed: formData.get('rightsConfirmed') === 'on'
  };
}

export function validateGameSubmission(submission) {
  const errors = [];
  const minPlayers = Number(submission.minPlayers);
  const maxPlayers = Number(submission.maxPlayers);
  const minDuration = Number(submission.minDuration);
  const maxDuration = Number(submission.maxDuration);

  if (!submission.name || submission.name.length < 2 || submission.name.length > 40) {
    errors.push('游戏名称需要填写 2～40 个字符。');
  }

  if (!submission.pitch || submission.pitch.length < 5 || submission.pitch.length > 120) {
    errors.push('一句话介绍需要填写 5～120 个字符。');
  }

  if (!Number.isInteger(minPlayers) || minPlayers < 2 || minPlayers > 30) {
    errors.push('最少人数需要填写 2～30 的整数。');
  }

  if (!Number.isInteger(maxPlayers) || maxPlayers < minPlayers || maxPlayers > 30) {
    errors.push('最多人数必须大于等于最少人数，且不超过 30。');
  }

  if (!Number.isInteger(minDuration) || minDuration < 1 || minDuration > 120) {
    errors.push('最短时间需要填写 1～120 分钟的整数。');
  }

  if (!Number.isInteger(maxDuration) || maxDuration < minDuration || maxDuration > 120) {
    errors.push('最长时间必须大于等于最短时间，且不超过 120 分钟。');
  }

  if (!Array.isArray(submission.venues) || submission.venues.length === 0) {
    errors.push('至少选择一个适合场地。');
  }

  if (!Array.isArray(submission.props) || submission.props.length === 0) {
    errors.push('至少选择一种道具条件。');
  }

  if (!Array.isArray(submission.vibes) || submission.vibes.length === 0) {
    errors.push('至少选择一种游戏气氛。');
  }

  if (!Array.isArray(submission.rules) || submission.rules.length < 1 || submission.rules.length > 5) {
    errors.push('规则需要填写 1～5 条。');
  } else if (submission.rules.some((rule) => rule.length < 2 || rule.length > 120)) {
    errors.push('每条规则需要填写 2～120 个字符。');
  }

  if (!Array.isArray(submission.hostSteps) || submission.hostSteps.length < 2 || submission.hostSteps.length > 6) {
    errors.push('主持人步骤需要填写 2～6 条。');
  } else if (submission.hostSteps.some((step) => step.length < 2 || step.length > 120)) {
    errors.push('每条主持人步骤需要填写 2～120 个字符。');
  }

  if (!Array.isArray(submission.safety) || submission.safety.length < 1 || submission.safety.length > 5) {
    errors.push('安全边界需要填写 1～5 条。');
  } else if (submission.safety.some((item) => item.length < 2 || item.length > 120)) {
    errors.push('每条安全边界需要填写 2～120 个字符。');
  }

  if (!SOURCE_TYPE_LABELS[submission.sourceType]) {
    errors.push('请选择内容来源类型。');
  }

  if (submission.sourceUrl && !/^https?:\/\//i.test(submission.sourceUrl)) {
    errors.push('来源链接必须以 http:// 或 https:// 开头。');
  }

  if (!submission.rightsConfirmed) {
    errors.push('请确认你有权提交这些内容，且没有复制受保护的规则原文。');
  }

  return errors;
}

export function buildSubmissionMarkdown(submission) {
  const rules = formatList(submission.rules, true);
  const hostSteps = formatList(submission.hostSteps, true);
  const variations = submission.variations.length > 0 ? formatList(submission.variations) : '- 暂无';
  const safety = formatList(submission.safety);
  const sourceUrl = submission.sourceUrl ? cleanInline(submission.sourceUrl) : '未提供';

  return `<!-- 这是由“开一局”投稿页面生成的游戏投稿。 -->

## 游戏信息

- 游戏名称：${cleanInline(submission.name)}
- 一句话介绍：${cleanInline(submission.pitch)}
- 人数：${Number(submission.minPlayers)}～${Number(submission.maxPlayers)} 人
- 时长：${Number(submission.minDuration)}～${Number(submission.maxDuration)} 分钟
- 场地：${formatLabels(submission.venues, VENUE_LABELS)}
- 道具：${formatLabels(submission.props, PROP_LABELS)}
- 气氛：${formatLabels(submission.vibes, VIBE_LABELS)}
- AI 主持：${submission.aiHostSupported ? '支持生成主持指令' : '建议人工主持'}

## 游戏规则

${rules}

## 主持人步骤

${hostSteps}

## 变体玩法

${variations}

## 安全边界

${safety}

## 内容来源

- 来源类型：${SOURCE_TYPE_LABELS[submission.sourceType] ?? cleanInline(submission.sourceType)}
- 来源链接：${sourceUrl}

## 投稿确认

- [x] 我确认规则为原创描述或有权使用，没有复制其他网站、商业桌游或付费应用的大段规则。
- [x] 我确认内容不包含隐私追问、危险动作、酒精强制机制或羞辱性惩罚。
`;
}

export function buildSubmissionIssueUrl(repository, submission) {
  const baseUrl = `https://github.com/${repository.owner}/${repository.repo}/issues/new`;
  const params = new URLSearchParams({
    title: `[游戏投稿] ${cleanInline(submission.name)}`,
    body: buildSubmissionMarkdown(submission)
  });

  return `${baseUrl}?${params.toString()}`;
}
