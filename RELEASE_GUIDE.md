# 🚀 Chrome Web Store 发布指南

## 快速发布流程

### 1. 构建发布包

```bash
# 运行生产构建，自动生成zip包
npm run build:prod
```

这个命令会：
- 清理旧的构建文件
- 使用生产配置构建项目
- 自动创建带版本号的zip包
- 验证所有必要文件是否包含

### 2. 检查生成的文件

生成的文件位于：`releases/form-privacy-watcher-v{version}.zip`

包含的文件：
- ✅ `manifest.json` - 扩展配置
- ✅ `background.js` - 后台服务
- ✅ `content.js` - 内容脚本
- ✅ `injected.js` - 注入脚本
- ✅ `popup.html/js/css` - 弹窗界面
- ✅ `options.html/js/css` - 设置页面
- ✅ `icons/` - 所有图标文件

### 3. 上传到Chrome Web Store

1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
2. 登录您的开发者账户
3. 点击 "添加新项目"
4. 上传生成的zip文件
5. 填写应用信息
6. 提交审核

## 版本管理

### 更新版本号

1. 修改 `package.json` 中的 `version` 字段
2. 修改 `src/manifest.json` 中的 `version` 字段
3. 更新 `CHANGELOG.md`
4. 重新构建：`npm run build:prod`

### 版本号规范

使用 [语义化版本](https://semver.org/lang/zh-CN/)：

- **主版本号**: 不兼容的 API 修改
- **次版本号**: 向下兼容的功能性新增
- **修订号**: 向下兼容的问题修正

示例：
- `1.0.0` - 首个稳定版本
- `1.1.0` - 新增功能
- `1.1.1` - Bug修复

## 发布检查清单

### 代码质量
- [ ] 所有测试通过: `npm test`
- [ ] 代码检查通过: `npm run lint`
- [ ] 类型检查通过: `npm run type-check`
- [ ] 构建成功: `npm run build:prod`

### 功能验证
- [ ] 在Chrome中加载扩展测试
- [ ] 所有核心功能正常工作
- [ ] 弹窗和设置页面显示正常
- [ ] 没有控制台错误

### 文档更新
- [ ] README.md 版本信息更新
- [ ] CHANGELOG.md 添加更新记录
- [ ] 发布说明准备完毕

### 商店资料
- [ ] 应用描述准确完整
- [ ] 截图和宣传图片最新
- [ ] 隐私政策链接有效
- [ ] 关键词优化完成

## 故障排除

### 构建失败

```bash
# 清理后重新构建
npm run clean
npm install
npm run build:prod
```

### zip包问题

```bash
# 手动检查zip包内容
unzip -l releases/form-privacy-watcher-v*.zip

# 手动创建zip包
cd dist
zip -r ../releases/manual-package.zip .
```

### 上传被拒绝

常见原因和解决方案：

1. **文件大小超限** - 优化资源文件
2. **权限过度** - 检查manifest.json权限配置
3. **隐私政策缺失** - 确保PRIVACY.md链接有效
4. **图标不符合规范** - 使用标准尺寸PNG图标

## 审核时间

- **首次提交**: 通常需要1-7个工作日
- **更新版本**: 通常需要1-3个工作日
- **紧急修复**: 可申请加急审核

## 自动化发布（可选）

可以集成GitHub Actions自动化发布流程：

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Build and package
        run: npm run build:prod
      - name: Upload to releases
        uses: actions/upload-artifact@v3
        with:
          name: chrome-extension
          path: releases/*.zip
```

---

**📞 需要帮助？** 

- 📧 发送邮件至: hewmbj@gmail.com
- 🐛 提交Issue: [GitHub Issues](https://github.com/0x-hewm/form-privacy-watcher/issues)
- 💬 参与讨论: [GitHub Discussions](https://github.com/0x-hewm/form-privacy-watcher/discussions)
