# 游戏数据格式

所有游戏放在 `src/data/games.json`。新增游戏必须遵循以下字段。

## 必填字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 唯一英文标识，小写短横线格式 |
| `name` | string | 游戏名称 |
| `pitch` | string | 一句话玩法 |
| `minPlayers` | number | 最少人数 |
| `maxPlayers` | number | 最多人数 |
| `durationMinutes` | [number, number] | 最短和最长预计时间 |
| `venues` | string[] | `dorm`、`livingRoom`、`restaurant`、`outdoor`、`bar` |
| `props` | string[] | `none`、`paperPen`、`cards`、`dice` |
| `vibes` | string[] | `icebreaker`、`funny`、`thinking`、`active`、`chat` |
| `familiarity` | string[] | `low`、`medium`、`high`；内部元数据，第一版界面不询问 |
| `aiHost` | object | `supported` 和 `voiceFriendly` |
| `rules` | string[] | 最多 5 条主要规则 |
| `hostSteps` | string[] | 主持人操作步骤 |
| `safety` | string[] | 安全和舒适边界 |
| `source` | object | `type` 和可选 `url` |

`source.type` 可以是：

- `original`：原创
- `traditional`：传统公共玩法
- `adapted`：基于公共玩法改编

## 内容要求

- 规则必须使用自己的话描述
- 不复制其他网站的规则原文
- 不收录商业桌游的完整玩法
- 至少实际测试过一次
- 不包含危险动作、酒精强制机制或侵犯隐私的内容
- 规则要能在一分钟内讲清楚
