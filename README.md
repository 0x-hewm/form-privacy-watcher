# Form Privacy Watcher

![CI/CD](https://github.com/0x-hewm/form-privacy-watcher/workflows/CI/CD%20Pipeline/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Chrome Web Store](https://img.shields.io/badge/chrome%20web%20store-v1.0.0-brightgreen.svg)

Form Privacy Watcher 是一款专业的 Chrome 浏览器扩展，用于实时监控网页表单数据的隐私安全。它能够检测和提醒用户表单数据是否在未提交前就被第三方脚本访问和传输，保护用户隐私数据安全。

## ✨ 主要功能

- 🔍 **实时监控** - 监控页面中所有表单字段的数据访问行为
- 🛡️ **隐私保护** - 检测第三方脚本对敏感数据的未授权访问
- 📊 **网络分析** - 分析网络请求中是否包含表单数据
- 🔒 **数据脱敏** - 智能识别和脱敏处理敏感信息
- ⚡ **实时提醒** - 检测到风险时立即通知用户
- 📋 **详细日志** - 记录所有检测事件，支持导出分析
- 🏷️ **白名单管理** - 灵活的白名单机制，减少误报
- ⚙️ **个性化设置** - 多种检测敏感度和通知选项

## 📦 安装方式

### Chrome Web Store（推荐）

1. 访问 [Chrome Web Store](https://chrome.google.com/webstore/detail/form-privacy-watcher/your-extension-id)
2. 点击 "添加至 Chrome"
3. 确认安装权限
4. 扩展图标将出现在浏览器工具栏

### 本地安装（开发者模式）

1. 下载最新版本的 [release](https://github.com/0x-hewm/form-privacy-watcher/releases)
2. 解压文件到本地目录
3. 打开 Chrome 浏览器，访问 `chrome://extensions/`
4. 开启右上角的 "开发者模式"
5. 点击 "加载已解压的扩展程序"
6. 选择解压后的扩展目录

## 🚀 快速开始

### 基本使用

1. **安装完成后**，扩展会自动在所有网页上开始监控
2. **绿色图标** 表示当前页面安全，无隐私风险
3. **红色图标** 表示检测到数据泄露，点击查看详情
4. **黄色图标** 表示当前网站在白名单中

### 处理隐私风险

当检测到隐私风险时：

1. 浏览器会显示通知提醒
2. 点击扩展图标查看详细信息
3. 可以选择：
   - 🔍 查看详细的泄露信息
   - 🛡️ 将网站添加到白名单
   - ⚙️ 调整检测设置

### 日志操作说明

在日志表格的最后一列"操作"中，每一行都有4个操作按钮：

#### 👁️ 查看详情按钮
- **功能**: 显示该违规事件的完整详细信息
- **包含内容**: 字段信息、风险等级、目标网站、来源脚本、泄露数据、检测时间、调用栈信息

#### 🛡️ 添加到白名单按钮
- **功能**: 将该域名快速添加到白名单
- **作用**: 加入白名单后，该域名的后续检测将被忽略
- **自动备注**: "从日志快速添加"

#### 🔇 忽略此类事件按钮
- **功能**: 临时隐藏当前显示的所有相同类型的违规事件
- **作用**: 只在当前会话中生效，刷新页面后会重新显示

#### ⚠️/↩️ 误报标记按钮
- **功能**: 标记或取消标记该事件为误报
- **智能建议**: 当某个域名的误报率超过50%时，系统会自动建议将其添加到白名单

### 管理设置

1. 右键点击扩展图标，选择 "选项"
2. 或访问 `chrome://extensions/` 找到扩展，点击 "详细信息" → "扩展选项"

## 🛠️ 开发指南

### 环境要求

- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- Chrome 88+ 或其他基于 Chromium 的浏览器

### 本地开发

```bash
# 克隆项目
git clone https://github.com/0x-hewm/form-privacy-watcher.git
cd form-privacy-watcher

# 安装依赖
npm install

# 启动开发模式（监听文件变化）
npm run dev

# 构建生产版本
npm run build:prod

# 运行测试
npm run test

# 代码检查
npm run lint

# 类型检查
npm run type-check
```

### 项目结构

```
form-privacy-watcher/
├── src/
│   ├── background/         # Service Worker
│   ├── content/           # Content Scripts
│   ├── injected/          # 注入页面的脚本
│   ├── popup/             # 弹窗页面
│   ├── options/           # 选项页面
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 工具函数
│   ├── icons/             # 图标资源
│   └── manifest.json      # 扩展清单
├── __tests__/             # 测试文件
├── dist/                  # 构建输出
├── docs/                  # 文档
└── web-ext-artifacts/     # 打包文件
```

### 构建与打包

```bash
# 开发环境构建
npm run build

# 生产环境构建
npm run build:prod

# 打包为 .zip 文件
npm run package

# 在 Firefox 中测试
npm run start:firefox

# 在 Chrome 中测试  
npm run start:chrome
```

## 🧪 测试

项目包含完整的测试套件：

```bash
# 运行所有测试
npm run test

# 监听模式运行测试
npm run test:watch

# 生成测试覆盖率报告
npm run test -- --coverage
```

测试覆盖以下方面：
- 单元测试：核心功能和工具函数
- 集成测试：扩展组件间交互
- 端到端测试：完整用户流程

## 📖 使用场景

### 适用人群

- 🔒 **隐私意识用户** - 关注个人数据保护的普通用户
- 💼 **企业用户** - 需要数据合规保障的商务人士
- 🏛️ **法律/金融从业者** - 对数据安全有严格要求的专业人士
- 🔬 **安全研究员** - 需要分析网站隐私行为的研究人员
- 📰 **媒体记者** - 调查数据追踪行为的新闻工作者

### 典型使用场景

1. **在线购物** - 保护信用卡和个人信息
2. **社交媒体** - 防止个人资料被第三方追踪
3. **工作邮箱** - 保护商业敏感信息
4. **银行业务** - 确保金融数据安全
5. **医疗健康** - 保护健康隐私信息
6. **教育平台** - 保护学生个人数据

## 🔧 配置选项

### 检测敏感度

- **低敏感度** - 只检测明显的数据泄露行为
- **中敏感度** - 平衡检测精度和误报率（推荐）
- **高敏感度** - 检测所有潜在的隐私风险

### 通知设置

- **桌面通知** - 高风险事件的系统通知
- **图标提醒** - 扩展图标颜色变化
- **详细日志** - 完整的检测事件记录

### 白名单管理

- 支持域名和路径级别的白名单
- 支持通配符匹配（如 `*.example.com`）
- 灵活的添加和移除机制

## 🛡️ 隐私承诺

我们严格遵守隐私保护原则：

- ✅ **本地处理** - 所有数据分析都在浏览器本地完成
- ✅ **无远程通信** - 扩展不与任何远程服务器通信
- ✅ **不收集数据** - 不收集用户的任何个人信息
- ✅ **开源透明** - 完整源代码开放，接受社区审计
- ✅ **用户控制** - 用户完全控制所有数据和设置

## 📊 技术实现

### 核心技术

- **Manifest V3** - 使用最新的 Chrome 扩展标准
- **TypeScript** - 类型安全的开发体验
- **Webpack** - 模块化构建和优化
- **Jest** - 完整的测试框架
- **ESLint** - 代码质量保证

### 检测原理

1. **DOM 监听** - 使用 MutationObserver 监控表单字段
2. **访问拦截** - 通过 Proxy 和 defineProperty 拦截数据访问
3. **网络分析** - 使用 webRequest API 分析网络请求
4. **栈追踪** - 分析调用栈识别第三方脚本
5. **数据匹配** - 智能匹配表单数据和网络请求

### 性能优化

- 使用 debounce/throttle 优化事件处理
- Web Worker 分离计算密集型任务
- 智能白名单减少不必要的检测
- 内存管理避免性能影响

## 🤝 贡献指南

我们欢迎社区贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细指南。

### 贡献方式

1. 🐛 **报告 Bug** - 在 Issues 中报告问题
2. 💡 **功能建议** - 提出新功能想法
3. 🔧 **代码贡献** - 提交 Pull Request
4. 📖 **文档改进** - 完善项目文档
5. 🌍 **国际化** - 帮助翻译到其他语言

### 开发流程

1. Fork 项目到你的 GitHub 账户
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解详细的版本更新记录。

### 最近更新

- **v1.0.0** (2024-06-20)
  - 🎉 首个稳定版本发布
  - ✨ 完整的表单隐私监控功能
  - 🛡️ 智能数据脱敏保护
  - 📊 详细的统计和日志功能

## ❓ 常见问题

### Q: 扩展会影响网页性能吗？
A: 不会。我们经过精心优化，对网页性能影响微乎其微。扩展使用了 debounce、Web Worker 等技术减少性能开销。

### Q: 如何处理误报？
A: 可以将信任的网站添加到白名单，或调整检测敏感度。我们也在持续优化算法减少误报。

### Q: 扩展是否收集我的数据？
A: 绝对不会。所有处理都在本地完成，扩展不与任何服务器通信，不收集用户数据。

### Q: 支持其他浏览器吗？
A: 目前专注于 Chrome，未来计划支持 Firefox、Edge 等浏览器。

### Q: 如何报告安全问题？
A: 请发送邮件至 security@example.com，我们会及时处理安全问题。

## � 文档导航

- 📖 **[完整文档索引](DOCS_INDEX.md)** - 所有文档的导航指南
- 🛠️ **[开发指南](DEVELOPMENT.md)** - 开发环境搭建和部署
- 🚀 **[发布指南](RELEASE_GUIDE.md)** - Chrome商店发布流程
- 🤝 **[贡献指南](CONTRIBUTING.md)** - 如何参与项目贡献
- 🔒 **[隐私政策](PRIVACY.md)** - 详细的隐私保护说明
- 📊 **[技术文档](TECHNICAL_DOCS.md)** - 技术架构和实现细节
- 📝 **[更新日志](CHANGELOG.md)** - 版本更新记录
- 🎯 **[项目状态](PROJECT_STATUS.md)** - 项目完成情况总结

## �📞 联系我们

- 🐛 **Bug 报告**：[GitHub Issues](https://github.com/0x-hewm/form-privacy-watcher/issues)
- 💬 **功能建议**：[GitHub Discussions](https://github.com/0x-hewm/form-privacy-watcher/discussions)
- 📧 **邮件联系**：hewmbj@gmail.com
- 🐦 **社交媒体**：[@FormPrivacyWatch](https://twitter.com/FormPrivacyWatch)

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) - 查看 LICENSE 文件了解详情。

## 🙏 致谢

感谢所有为项目做出贡献的开发者和用户！

- 特别感谢 [Chrome Extensions API](https://developer.chrome.com/docs/extensions/) 文档团队
- 感谢开源社区提供的优秀工具和库
- 感谢所有提供反馈和建议的用户

---

**让我们一起保护网络隐私安全！** 🛡️
