# 贡献指南

感谢您对 Form Privacy Watcher 项目的关注！我们欢迎各种形式的贡献，包括但不限于代码提交、bug 报告、功能建议、文档改进等。

## 🤝 贡献方式

### 1. 报告问题 (Issues)

如果您发现了 bug 或有功能建议，请：

1. 先搜索现有的 [Issues](https://github.com/0x-hewm/form-privacy-watcher/issues) 确认问题未被报告
2. 创建新的 Issue，使用合适的模板
3. 提供详细的描述和复现步骤

#### Bug 报告应包含

- 问题的详细描述
- 复现步骤
- 预期行为 vs 实际行为
- 环境信息（浏览器版本、操作系统等）
- 相关截图或日志

#### 功能请求应包含

- 功能的详细描述
- 使用场景和用户价值
- 可能的实现方案（可选）

### 2. 代码贡献 (Pull Requests)

#### 开发环境设置

1. **Fork 项目**
   ```bash
   # 在 GitHub 上 Fork 项目到你的账户
   ```

2. **克隆代码**
   ```bash
   git clone https://github.com/YOUR_USERNAME/form-privacy-watcher.git
   cd form-privacy-watcher
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **创建开发分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

5. **开发和测试**
   ```bash
   npm run dev          # 启动开发模式
   npm run test         # 运行测试
   npm run lint         # 代码检查
   npm run type-check   # 类型检查
   ```

6. **提交代码**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   git push origin feature/your-feature-name
   ```

7. **创建 Pull Request**
   - 在 GitHub 上创建 Pull Request
   - 填写详细的描述
   - 等待代码审核

### 3. 文档贡献

我们同样重视文档改进：

- 修复文档中的错误
- 改进现有文档的清晰度
- 添加使用示例
- 翻译文档到其他语言

### 4. 测试贡献

帮助我们提高代码质量：

- 报告和修复测试中的问题
- 增加新的测试用例
- 提高测试覆盖率
- 性能测试和优化

## 📋 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则配置
- 使用 Prettier 进行代码格式化
- 保持代码简洁和可读性

### 提交信息格式

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
type(scope): description

[optional body]

[optional footer]
```

#### 类型说明：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建工具或辅助工具的变动

#### 示例：

```bash
feat(popup): add dark mode support
fix(content): resolve memory leak in form monitoring
docs(readme): update installation instructions
```

### 分支命名规范

- `feature/` - 新功能开发
- `fix/` - Bug 修复
- `docs/` - 文档更新
- `refactor/` - 代码重构
- `test/` - 测试相关

### 代码审核

所有 Pull Request 都需要经过代码审核：

1. **自动检查** - CI/CD 流程自动运行测试和检查
2. **人工审核** - 项目维护者审核代码质量和设计
3. **测试验证** - 确保新功能正常工作且不破坏现有功能

## 🧪 测试指南

### 运行测试

```bash
# 运行所有测试
npm run test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test -- --coverage
```

### 编写测试

- 为新功能编写相应的测试用例
- 确保测试能够覆盖边界情况
- 使用描述性的测试名称
- 保持测试简单和独立

### 测试文件结构

```
src/__tests__/
├── dataSanitizer.test.ts     # 数据脱敏测试
├── e2e.test.ts              # 端到端测试
└── setup.ts                 # 测试环境配置
```

## 🏗️ 项目架构理解

### 核心组件

- **Background Script** - 扩展的后台服务
- **Content Script** - 注入网页的脚本
- **Injected Script** - 深度监控脚本
- **Popup** - 扩展弹窗界面
- **Options** - 设置页面

### 数据流

```
网页表单 → Injected Script → Content Script → Background Script → UI 组件
```

### 消息通信

使用 Chrome Extension API 进行组件间通信：

```typescript
// 发送消息
chrome.runtime.sendMessage({
  type: 'FORM_DATA_ACCESS',
  data: {...}
});

// 接收消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FORM_DATA_ACCESS') {
    // 处理消息
  }
});
```

## 🔍 调试技巧

### Chrome DevTools

- **扩展页面调试**: 右键扩展图标 → 审查弹出内容
- **Content Script 调试**: 在网页上打开开发者工具
- **Background Script 调试**: chrome://extensions/ → 详细信息 → 审查视图

### 日志输出

```typescript
// 在开发模式下启用调试日志
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}
```

### 常见问题

1. **权限问题** - 检查 manifest.json 中的权限配置
2. **消息通信失败** - 确认消息格式和处理逻辑
3. **扩展加载失败** - 查看 Chrome 扩展页面的错误信息

## 📚 学习资源

### 官方文档

- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 迁移指南](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)

### 项目相关

- [项目架构文档](doc/Form%20Privacy%20Watcher%20项目文档.md)
- [开发指南](DEVELOPMENT.md)
- [隐私政策](PRIVACY.md)

## 🎯 贡献建议

### 新手入门

如果您是新手，建议从以下任务开始：

1. **文档改进** - 修复文档中的错误或不清楚的地方
2. **小 Bug 修复** - 查看标记为 "good first issue" 的问题
3. **测试用例** - 为现有功能编写测试用例
4. **UI 优化** - 改进用户界面的小细节

### 高级贡献

如果您有经验，可以考虑：

1. **新功能开发** - 实现新的隐私保护功能
2. **性能优化** - 优化扩展的性能和内存使用
3. **架构改进** - 重构和改进代码架构
4. **多浏览器支持** - 适配其他浏览器

## 🏆 贡献者认可

我们非常感谢每一位贡献者！

- 所有贡献者都会在 README.md 中得到认可
- 重要贡献者会被邀请成为项目维护者
- 我们会在社交媒体上推广优秀的贡献

## 📞 联系我们

如果您有任何问题或需要帮助：

- 💬 **GitHub Discussions** - 技术讨论和问答
- 🐛 **GitHub Issues** - Bug 报告和功能请求  
- 📧 **邮件** - hewmbj@gmail.com
- 💬 **即时聊天** - 项目 Discord 群组（即将开放）

## 📄 许可证

通过向本项目贡献代码，您同意您的贡献将使用与项目相同的 [MIT 许可证](LICENSE) 进行许可。

---

**再次感谢您的贡献！让我们一起让互联网变得更加安全和私密！** 🛡️
   git checkout -b bugfix/issue-number
   ```

#### 开发流程

1. **编写代码**
   - 遵循项目的代码规范
   - 添加必要的测试
   - 确保现有测试通过

2. **测试你的更改**
   ```bash
   # 运行测试
   npm run test
   
   # 类型检查
   npm run type-check
   
   # 代码检查
   npm run lint
   
   # 构建项目
   npm run build
   ```

3. **提交更改**
   ```bash
   git add .
   git commit -m "feat: add new privacy detection algorithm"
   ```

4. **推送分支**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **创建 Pull Request**
   - 在 GitHub 上创建 PR
   - 填写 PR 模板
   - 等待代码审查

## 📝 代码规范

### TypeScript 规范

- 使用 TypeScript 进行开发
- 所有函数和类都要有类型注解
- 避免使用 `any`，优先使用具体类型
- 使用 ESLint 进行代码检查

### 命名规范

- **文件名**: kebab-case (`form-monitor.ts`)
- **类名**: PascalCase (`FormMonitor`)
- **函数名**: camelCase (`detectPrivacyViolation`)
- **常量**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`)
- **接口**: PascalCase，以 `I` 开头可选 (`FormField` 或 `IFormField`)

### 代码风格

```typescript
// ✅ 好的例子
class FormMonitor {
  private readonly fields: Map<string, FormField> = new Map();
  
  public async detectViolation(field: FormField): Promise<PrivacyViolation | null> {
    if (!this.isValidField(field)) {
      return null;
    }
    
    const violation = await this.analyzeField(field);
    return violation;
  }
  
  private isValidField(field: FormField): boolean {
    return field.value.length > 0 && field.type !== 'hidden';
  }
}

// ❌ 不好的例子
class formmonitor {
  fields: any;
  
  detectViolation(field: any) {
    if (field.value.length > 0) {
      return this.analyzeField(field);
    }
  }
}
```

### 提交消息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### 类型 (Type)
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式化（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建或工具相关

#### 示例
```bash
feat(detector): add phone number detection algorithm
fix(popup): resolve rendering issue on small screens
docs(readme): update installation instructions
test(sanitizer): add tests for email sanitization
```

## 🧪 测试指南

### 测试结构

```
src/
├── __tests__/
│   ├── setup.ts              # 测试环境配置
│   ├── dataSanitizer.test.ts  # 单元测试
│   └── integration/          # 集成测试
└── components/
    └── FormMonitor.ts
```

### 编写测试

1. **单元测试** - 测试独立的函数和类
2. **集成测试** - 测试组件间的交互
3. **E2E 测试** - 测试完整的用户流程

```typescript
// 测试示例
describe('DataSanitizer', () => {
  describe('sanitizePhone', () => {
    test('should mask middle digits of phone number', () => {
      const result = DataSanitizer.sanitizePhone('13812345678');
      expect(result).toBe('138****5678');
    });
    
    test('should handle invalid phone numbers', () => {
      const result = DataSanitizer.sanitizePhone('invalid');
      expect(result).toBe('invalid');
    });
  });
});
```

### 测试覆盖率

- 目标：保持 80% 以上的代码覆盖率
- 核心功能：要求 90% 以上覆盖率
- 新增代码：必须包含相应测试

## 📚 文档贡献

### 文档类型

1. **API 文档** - 代码中的 JSDoc 注释
2. **用户文档** - README.md, 使用指南
3. **开发文档** - 架构设计, 开发指南
4. **国际化** - 多语言翻译

### 文档风格

- 使用清晰、简洁的语言
- 提供具体的示例
- 保持文档与代码同步更新
- 使用适当的 Markdown 格式

```markdown
## 功能标题

简要描述功能的作用和目的。

### 使用方法

1. 步骤一：描述第一步操作
2. 步骤二：描述第二步操作

```javascript
// 代码示例
const example = new ExampleClass();
example.doSomething();
```

### 注意事项

- 重要提醒事项
- 可能的限制或问题
```

## 🎯 开发优先级

### 高优先级
- 🐛 严重 Bug 修复
- 🔒 安全问题修复
- ⚡ 性能优化

### 中优先级
- ✨ 新功能开发
- 🔧 代码重构
- 📖 文档完善

### 低优先级
- 🎨 UI/UX 改进
- 🌍 国际化支持
- 🧪 测试覆盖率提升

## 🔍 代码审查

### 审查清单

#### 功能性
- [ ] 代码按预期工作
- [ ] 处理了边界情况
- [ ] 错误处理得当
- [ ] 性能表现良好

#### 代码质量
- [ ] 代码清晰易读
- [ ] 遵循项目规范
- [ ] 适当的注释和文档
- [ ] 没有代码重复

#### 测试
- [ ] 包含相应测试
- [ ] 测试覆盖率足够
- [ ] 测试用例全面

#### 安全性
- [ ] 没有安全漏洞
- [ ] 输入验证充分
- [ ] 权限控制正确

### 审查流程

1. **自我审查** - 提交前自己先审查
2. **自动检查** - CI/CD 自动运行检查
3. **人工审查** - 维护者进行代码审查
4. **反馈处理** - 根据反馈修改代码
5. **合并代码** - 审查通过后合并

## 📋 发布流程

### 版本号规范

遵循 [语义化版本](https://semver.org/) (SemVer):

- `MAJOR.MINOR.PATCH`
- `1.0.0` → `1.0.1` (补丁)
- `1.0.0` → `1.1.0` (次版本)
- `1.0.0` → `2.0.0` (主版本)

### 发布步骤

1. **更新版本号**
   ```bash
   npm version patch  # 补丁版本
   npm version minor  # 次版本
   npm version major  # 主版本
   ```

2. **更新 CHANGELOG**
   - 记录所有重要变更
   - 按版本组织内容
   - 包含破坏性变更说明

3. **创建 Release**
   - 在 GitHub 创建 Release
   - 附上编译后的扩展文件
   - 包含详细的发布说明

## 🌍 国际化支持

### 添加新语言

1. 在 `src/locales/` 目录添加语言文件
2. 更新语言配置
3. 翻译所有文本内容
4. 测试多语言显示效果

### 翻译指南

- 保持译文简洁明了
- 考虑文化差异
- 使用一致的术语
- 测试文本长度适配

## 🚀 社区参与

### 讨论区

使用 [GitHub Discussions](https://github.com/0x-hewm/form-privacy-watcher/discussions) 进行：

- 功能讨论
- 使用问题
- 分享经验
- 社区交流

### 活动参与

- 定期在线会议
- 黑客松活动
- 技术分享
- 用户反馈收集

## 📞 获取帮助

如果在贡献过程中遇到问题：

1. 查阅现有文档和 Issues
2. 在 Discussions 中提问
3. 联系维护者：hewmbj@gmail.com
4. 加入我们的 Discord 社区

## 🏆 贡献者认可

我们重视每一个贡献，贡献者将会：

- 在 README 中被列出
- 获得特殊的 GitHub 徽章
- 优先获得新功能预览
- 参与项目决策讨论

感谢你的贡献，让我们一起建设更好的隐私保护工具！ 🛡️
