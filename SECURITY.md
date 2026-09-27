# 安全说明

## 当前项目是否包含 API Key

当前“开一局”不会直接调用第三方 AI API。它只根据游戏数据生成一段可复制的 AI 主持人指令，因此项目本身不需要 API Key。

## 以后接入 AI API 时

- 不要把真实 Key 写进 HTML、JavaScript、JSON、README 或测试数据。
- `.env` 和 `.env.*` 已被 `.gitignore` 忽略。
- GitHub Pages 是纯静态托管，不能安全保存服务端密钥。
- 如果由用户自己提供 Key，应只保存在用户浏览器本地，并明确提示风险。
- 如果由项目方承担 API 成本，必须使用后端代理或云函数，把 Key 放在服务端环境变量中。
- 不要把 GitHub Actions Secret 打包进前端，因为前端构建产物可以被所有人查看。

## 提交前检查

```powershell
git status
git diff --cached
git check-ignore -v --no-index .env .env.local
```

检查是否出现：

- `sk-` 开头的密钥
- `api_key=`
- `token=`
- `secret=`
- `Authorization: Bearer ...`

## 如果误传了密钥

1. 立即到服务商后台撤销旧 Key。
2. 创建新 Key。
3. 删除提交历史中的旧 Key，而不是只删除最新文件。
4. 检查部署平台环境变量和构建日志。
