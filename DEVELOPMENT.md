# 开发和部署指南

## 🛠️ 开发环境设置

### 前置要求

- Node.js 18+ 
- npm 9+
- Chrome 浏览器 88+

### 初始化项目

```bash
# 克隆项目
git clone https://github.com/0x-hewm/form-privacy-watcher.git
cd form-privacy-watcher

# 安装依赖
npm install

# 运行类型检查
npm run type-check
```

## 🔧 开发流程

### 本地开发

```bash
# 启动开发模式（文件监听）
npm run dev

# 在另一个终端运行测试
npm run test:watch
```

### 在浏览器中加载插件

1. 运行 `npm run build` 构建插件
2. 打开 Chrome 浏览器
3. 访问 `chrome://extensions/`
4. 启用"开发者模式"
5. 点击"加载已解压的扩展程序"
6. 选择项目的 `dist/` 目录

### 使用 web-ext 工具

```bash
# 在 Chrome 中启动
npm run start:chrome

# 在 Firefox 中启动
npm run start:firefox
```

## 🧪 测试指南

### 运行测试

```bash
# 运行所有测试
npm run test

# 监听模式运行测试
npm run test:watch

# 生成测试覆盖率报告
npm run test -- --coverage
```

### 测试覆盖

- **单元测试** - DataSanitizer 数据脱敏测试
- **集成测试** - Chrome 扩展加载测试
- **端到端测试** - 表单监控流程测试

### 测试文件结构

```
src/__tests__/
├── dataSanitizer.test.ts     # 数据脱敏单元测试
├── e2e.test.ts              # 端到端测试
└── setup.ts                 # 测试环境配置
```

## 📦 构建和发布

### 开发构建

```bash
# 开发环境构建
npm run build

# 开发模式（监听文件变化）
npm run dev

# 清理构建文件
npm run clean
```

### 生产构建和打包

```bash
# 完整的生产构建流程（包含zip打包）
npm run build:prod

# 这个命令会依次执行：
# 1. npm run clean - 清理旧的构建文件
# 2. webpack 生产构建 - 生成优化后的代码
# 3. npm run create-zip - 创建带版本号的zip包
```

### Chrome Web Store 发布包

运行 `npm run build:prod` 后，会在 `releases/` 目录生成：

- **文件名格式**: `form-privacy-watcher-v{version}.zip`
- **示例**: `form-privacy-watcher-v1.0.0.zip`
- **包含内容**: 
  - 所有必要的扩展文件
  - 压缩优化的JavaScript代码
  - 图标和样式文件
  - manifest.json

### 发布流程验证

构建脚本会自动验证以下必要文件：

- ✅ `manifest.json` - 扩展清单文件
- ✅ `background.js` - 后台脚本
- ✅ `content.js` - 内容脚本
- ✅ `popup.html` - 弹窗页面
- ✅ `options.html` - 设置页面

### 手动打包（备用方案）

如果需要手动创建zip包：

```bash
# 先构建项目
npm run build

# 手动创建zip包
cd dist
zip -r ../releases/form-privacy-watcher-manual.zip .
```
# 生产环境构建
npm run build:prod

# 完整构建流程（包含测试和检查）
./build.sh
```

### 打包发布

```bash
# 创建发布包
npm run package

# 生成的文件位于 web-ext-artifacts/ 目录
```

## 🏗️ 项目架构

### 核心组件

- **Background Script** (`src/background/`) - Service Worker，处理扩展生命周期
- **Content Script** (`src/content/`) - 注入到网页，监控表单
- **Injected Script** (`src/injected/`) - 深度监控表单字段访问
- **Popup** (`src/popup/`) - 扩展弹窗界面
- **Options** (`src/options/`) - 设置页面

### 数据流

```
Injected Script → Content Script → Background Script → Popup/Options
```

1. **Injected Script** 检测表单字段访问
2. **Content Script** 接收并过滤事件
3. **Background Script** 处理和存储数据
4. **UI 组件** 展示结果和配置

### 技术栈

- **TypeScript** - 类型安全的开发
- **Webpack** - 模块打包和构建
- **Jest** - 测试框架
- **ESLint** - 代码规范检查
- **Prettier** - 代码格式化

## 🔧 配置文件说明

### TypeScript 配置

- `tsconfig.json` - 主要 TypeScript 配置
- `tsconfig.build.json` - 构建专用配置

### Webpack 配置

- `webpack.config.js` - 构建配置，支持开发和生产模式

### 测试配置

- `jest.config.js` - Jest 测试框架配置

### 代码质量

- `.eslintrc.js` - ESLint 规则配置
- `.prettierrc` - Prettier 格式化配置

## 🚀 Chrome Web Store 发布

### 发布前检查清单

#### 代码质量
- [ ] 所有测试通过
- [ ] 代码 lint 检查通过
- [ ] TypeScript 类型检查通过
- [ ] 性能测试完成
- [ ] 安全审核完成

#### 文档完整性
- [ ] README.md 完整
- [ ] PRIVACY.md 隐私政策
- [ ] CHANGELOG.md 更新日志
- [ ] 用户使用说明

#### 商店资料
- [ ] 应用图标（128x128px）
- [ ] 宣传图片准备完成
- [ ] 应用描述撰写完成
- [ ] 关键词优化
- [ ] 分类选择正确

### 商店资料准备

#### 应用图标
- **要求**: 128x128px PNG 格式
- **设计原则**: 简洁、清晰、专业
- **当前图标**: `src/icons/icon128.svg`（需转换为 PNG）

#### 宣传图片

**小型宣传图片（440x280px）**
建议展示插件的核心功能：
- 表单监控界面
- 隐私保护提示
- 安全警告

**大型宣传图片（920x680px）**
详细展示插件特性：
- 完整的用户界面
- 功能特性说明
- 使用场景演示

**横幅图片（1400x560px）**
用于 Chrome Web Store 首页推荐：
- 品牌标识
- 核心价值主张
- 视觉冲击力

### 应用描述模板

```
保护您的表单数据隐私安全

Form Privacy Watcher 是一款专业的隐私保护扩展，实时监控网页表单数据是否被第三方脚本未授权访问。

🔍 主要功能：
• 实时表单监控
• 隐私风险检测
• 智能数据脱敏
• 详细安全日志
• 灵活白名单管理

🛡️ 隐私承诺：
• 100% 本地处理
• 零数据收集
• 开源代码审计
• 符合 GDPR 标准

适用于关注隐私安全的个人用户、企业用户和安全研究人员。
```

### 发布步骤

1. **准备发布包**
   ```bash
   npm run build:prod
   npm run package
   ```

2. **上传到 Chrome Web Store**
   - 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
   - 上传 zip 文件
   - 填写商店信息
   - 上传宣传图片

3. **提交审核**
   - 检查所有信息
   - 提交审核
   - 等待 Google 审核通过

### 版本更新流程

1. **更新版本号**
   - 更新 `package.json` 中的 version
   - 更新 `src/manifest.json` 中的 version
   - 更新 `CHANGELOG.md`

2. **构建和测试**
   ```bash
   npm run build:prod
   npm run test
   ```

3. **发布新版本**
   - 创建 Git tag
   - 推送到 GitHub
   - 上传到 Chrome Web Store

## 🔍 调试和故障排除

### 常见问题

#### 扩展加载失败
- 检查 manifest.json 语法
- 确认所有文件路径正确
- 查看 Chrome 扩展页面的错误信息

#### 测试失败
- 清理 node_modules 重新安装依赖
- 检查 Jest 配置
- 确认测试环境变量

#### 构建错误
- 检查 TypeScript 类型错误
- 确认 Webpack 配置
- 查看具体错误信息

### 调试技巧

#### Chrome DevTools
- 右键扩展图标 → 审查弹出内容
- 在网页上右键 → 审查元素 → Console
- chrome://extensions/ → 详细信息 → 审查视图

#### 日志输出
```typescript
// 在开发模式下启用详细日志
if (process.env.NODE_ENV === 'development') {
  console.log('调试信息');
}
```

## 🤝 贡献指南

### 代码贡献

1. **Fork 项目**
2. **创建功能分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **提交更改**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **推送分支**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **创建 Pull Request**

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 添加必要的单元测试
- 更新相关文档

### 提交信息格式

```
type(scope): description

[optional body]

[optional footer]
```

类型说明：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建和工具相关

---

**感谢您对 Form Privacy Watcher 项目的贡献！**

# 在 Firefox 中启动
npm run start:firefox

# 打包扩展
npm run package
```

## 🧪 测试

### 运行所有测试

```bash
npm test
```

### 运行特定测试

```bash
# 单元测试
npm test -- --testPathPattern=dataSanitizer

# 端到端测试
npm test -- --testPathPattern=e2e
```

### 测试覆盖率

```bash
npm test -- --coverage
```

## 🔍 调试

### Content Script 调试

1. 在网页上右键 → "检查"
2. 在 Console 面板中可以看到 content script 的日志
3. 在 Sources 面板中可以设置断点

### Background Script 调试

1. 访问 `chrome://extensions/`
2. 找到插件，点击"服务工作器"链接
3. 在打开的开发者工具中调试

### Popup 调试

1. 右键点击插件图标
2. 选择"检查弹出内容"
3. 在打开的开发者工具中调试

## 📋 测试场景

### 手动测试场景

#### 1. 基本表单监控

1. 访问任意包含表单的网站
2. 填写表单字段
3. 检查插件是否检测到敏感字段
4. 查看控制台日志

#### 2. 密码字段监控

1. 访问登录页面
2. 输入用户名和密码
3. 验证密码字段被正确识别
4. 检查数据脱敏功能

#### 3. 网络请求监控

1. 提交包含敏感数据的表单
2. 检查是否捕获到网络请求
3. 验证敏感数据检测

#### 4. 白名单功能

1. 在选项页面添加信任域名
2. 访问该域名
3. 验证监控行为改变

### 测试数据

#### 敏感数据示例

```javascript
// 手机号
const phones = ['13812345678', '15987654321'];

// 邮箱
const emails = ['test@example.com', 'user@domain.org'];

// 身份证号
const idCards = ['110101199001011234', '440301198506201567'];

// 信用卡号
const creditCards = ['4111111111111111', '5555555555554444'];
```

#### 测试表单

```html
<!-- 登录表单 -->
<form>
  <input type="email" name="email" placeholder="邮箱">
  <input type="password" name="password" placeholder="密码">
  <button type="submit">登录</button>
</form>

<!-- 注册表单 -->
<form>
  <input type="text" name="username" placeholder="用户名">
  <input type="email" name="email" placeholder="邮箱">
  <input type="tel" name="phone" placeholder="手机号">
  <input type="password" name="password" placeholder="密码">
  <input type="password" name="confirmPassword" placeholder="确认密码">
  <button type="submit">注册</button>
</form>
```

## 🚀 构建和发布

### 构建生产版本

```bash
# 使用构建脚本
./build.sh

# 或手动构建
npm run build:prod
```

### 发布到 Chrome Web Store

1. 构建生产版本
2. 创建发布包：`npm run package`
3. 登录 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
4. 上传扩展包
5. 填写商店信息
6. 提交审核

## 🔧 常见问题

### 权限问题

如果遇到权限相关错误，检查 `manifest.json` 中的权限配置：

```json
{
  "permissions": [
    "scripting",
    "storage", 
    "webRequest",
    "tabs",
    "notifications",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

### 构建问题

如果构建失败，尝试：

```bash
# 清理依赖
rm -rf node_modules package-lock.json
npm install

# 清理构建缓存
rm -rf dist/
npm run build
```

### 类型错误

如果遇到 TypeScript 错误：

```bash
# 检查类型
npm run type-check

# 查看详细错误
npx tsc --noEmit --pretty
```

## 📝 代码规范

### ESLint 配置

项目使用 ESLint 进行代码检查：

```bash
# 运行 lint
npm run lint

# 自动修复
npm run lint -- --fix
```

### Git 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 重构代码
test: 添加测试
chore: 构建过程或辅助工具的变动
```

## 🤝 贡献指南

请参考 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详细的贡献指南。
