# AI 知识库与工作台

一个基于浏览器的个人 AI 知识库与工作台应用，支持待办管理、收集箱、AI 聊天助手和全局搜索。

## 功能模块

| 模块 | 功能 |
|------|------|
| 📋 **待办事项** | 添加/完成/删除待办，按高/中/低优先级分类筛选 |
| 📥 **收集箱** | 快速存放文本、网址、笔记，支持标签和 AI 自动分类 |
| 🤖 **AI 助手** | 集成聊天窗口，支持 OpenAI 和 Claude API，可分析知识库内容 |
| 🔍 **全局搜索** | 实时过滤待办和收集箱内容 |
| ⚙️ **设置** | API Key 配置、数据导入/导出、使用说明 |

## 技术栈

- **HTML5** + **Tailwind CSS** (CDN)
- **原生 JavaScript** (ES6+)
- **localStorage** 本地数据持久化
- 零依赖、零构建工具

## 本地运行

### 方法一：直接打开（最简单）

双击 `index.html` 即可在浏览器中运行。

> ⚠️ 注意：从 `file://` 协议打开时，AI API 调用（OpenAI/Claude）可能因 CORS 限制无法正常工作。建议使用方法二进行完整体验。

### 方法二：本地服务器（推荐）

```bash
# 进入项目目录
cd ai-knowledge-base

# Python (任意一种)
python -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code Live Server 插件
# 右键 index.html → "Open with Live Server"
```

浏览器打开 `http://localhost:8080`。

### 手机端预览

在同一 Wi-Fi 网络下：

1. **Windows**: 先查看本机 IP
   ```powershell
   ipconfig
   ```
   找到 `IPv4 Address`（如 `192.168.1.100`）

2. 启动本地服务器（方法二中的任意命令）

3. 手机浏览器访问 `http://192.168.1.100:8080`

4. 确保 Windows 防火墙允许入站连接到 8080 端口

## API Key 配置

1. 点击左侧「⚙️ 设置」
2. 选择默认模型（Claude 或 OpenAI）
3. 填入对应的 API Key：
   - **Claude**: [console.anthropic.com](https://console.anthropic.com) → API Keys
   - **OpenAI**: [platform.openai.com](https://platform.openai.com) → API Keys
4. 点击保存

> 🔒 API Key 仅存储在浏览器 localStorage，不会上传到任何第三方服务器。

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+K` | 聚焦全局搜索 |
| `Enter` | 发送消息 / 添加待办 |
| `Shift+Enter` | 聊天中换行 |
| `Esc` | 关闭确认弹窗 |

## 数据备份

在「设置」页面可导出/导入 JSON 格式的完整数据备份。建议定期导出。

## 项目结构

```
ai-knowledge-base/
├── index.html          # 主页面
├── css/
│   └── styles.css      # 自定义样式
├── js/
│   └── app.js          # 核心应用逻辑
└── README.md           # 本文件
```
