# 互动挑战数据格式

互动挑战位于 `src/data/interactions.json`，用于替代羞辱性惩罚。任何挑战都必须允许玩家无理由跳过。

## 必填字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 唯一英文标识 |
| `title` | string | 挑战名称 |
| `prompt` | string | 玩家需要完成的具体任务 |
| `category` | string | `icebreaker`、`performance`、`creative`、`team`、`talk` |
| `intensity` | number | 1 轻松、2 有笑点、3 高能 |
| `durationMinutes` | number | 预计需要几分钟 |
| `props` | string[] | `none`、`paperPen`、`cards` |
| `safety` | string | 明确的安全和舒适边界 |

## 内容原则

- 不公开隐私
- 不评价外貌、身材、收入和家庭情况
- 不做危险动作
- 不强迫唱歌、跳舞或展示才艺
- 不使用酒精
- 不制造羞辱和人际压力
- 必须明确写出安全边界
