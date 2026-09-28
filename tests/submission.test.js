import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSubmissionIssueUrl,
  buildSubmissionMarkdown,
  resolveRepository,
  validateGameSubmission
} from '../src/features/submission.js';

const validSubmission = {
  name: '宿舍默契问答',
  pitch: '两人同时说出同一答案，看看谁更有默契。',
  minPlayers: 4,
  maxPlayers: 12,
  minDuration: 10,
  maxDuration: 20,
  venues: ['dorm', 'livingRoom'],
  props: ['none'],
  vibes: ['funny', 'icebreaker'],
  aiHostSupported: true,
  rules: ['主持人给出一个类别。', '每组同时说出一个答案。'],
  hostSteps: ['说明规则。', '给出类别。', '记录分数。'],
  variations: ['增加不能说的词。'],
  safety: ['允许玩家跳过。'],
  sourceType: 'original',
  sourceUrl: '',
  rightsConfirmed: true
};

test('有效投稿可以通过校验', () => {
  assert.deepEqual(validateGameSubmission(validSubmission), []);
});

test('缺少必要字段时返回明确错误', () => {
  const errors = validateGameSubmission({
    ...validSubmission,
    name: '',
    minPlayers: 10,
    maxPlayers: 4,
    rightsConfirmed: false
  });

  assert.ok(errors.some((error) => error.includes('游戏名称')));
  assert.ok(errors.some((error) => error.includes('最多人数')));
  assert.ok(errors.some((error) => error.includes('有权提交')));
});

test('投稿 Markdown 包含人类可读的标签', () => {
  const markdown = buildSubmissionMarkdown(validSubmission);

  assert.match(markdown, /## 游戏信息/);
  assert.match(markdown, /宿舍、客厅/);
  assert.match(markdown, /搞笑、破冰/);
  assert.match(markdown, /宿舍默契问答/);
});

test('Issue 链接指向投稿页并包含标题和正文', () => {
  const repository = resolveRepository({
    hostname: 'kiraaa828.github.io',
    pathname: '/kai-yiju/'
  });
  const url = buildSubmissionIssueUrl(repository, validSubmission);

  assert.equal(repository.owner, 'kiraaa828');
  assert.equal(repository.repo, 'kai-yiju');
  assert.match(url, /^https:\/\/github\.com\/kiraaa828\/kai-yiju\/issues\/new\?/);
  assert.equal(new URL(url).searchParams.get('title'), '[游戏投稿] 宿舍默契问答');
});
