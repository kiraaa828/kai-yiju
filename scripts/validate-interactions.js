import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = path.join(ROOT, 'src', 'data', 'interactions.json');
const allowedCategories = new Set(['icebreaker', 'performance', 'creative', 'team', 'talk']);
const allowedProps = new Set(['none', 'paperPen', 'cards']);
const failures = [];

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const interactions = JSON.parse(await readFile(DATA_PATH, 'utf8'));
check(Array.isArray(interactions), 'interactions.json 必须是数组。');

if (Array.isArray(interactions)) {
  const ids = new Set();

  interactions.forEach((item, index) => {
    const label = item?.id || `第 ${index + 1} 条互动`;

    check(isNonEmptyString(item.id), `${label}: id 不能为空。`);
    check(!ids.has(item.id), `${label}: id 重复。`);
    ids.add(item.id);
    check(isNonEmptyString(item.title), `${label}: title 不能为空。`);
    check(isNonEmptyString(item.prompt), `${label}: prompt 不能为空。`);
    check(allowedCategories.has(item.category), `${label}: category 无效。`);
    check([1, 2, 3].includes(item.intensity), `${label}: intensity 必须是 1、2 或 3。`);
    check(Number.isFinite(item.durationMinutes) && item.durationMinutes > 0, `${label}: durationMinutes 必须大于 0。`);
    check(Array.isArray(item.props) && item.props.every((prop) => allowedProps.has(prop)), `${label}: props 包含未知值。`);
    check(isNonEmptyString(item.safety), `${label}: safety 不能为空。`);
  });
}

if (failures.length > 0) {
  console.error(`互动数据校验失败，共 ${failures.length} 个问题：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`互动数据校验通过：共 ${interactions.length} 条。`);
}
