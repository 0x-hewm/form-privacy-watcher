#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 读取package.json获取版本号
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = packageJson.version;
const name = packageJson.name;

// 创建发布目录
const releaseDir = path.join(__dirname, '../releases');
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

// 生成zip文件名
const zipFileName = `${name}-v${version}.zip`;
const zipFilePath = path.join(releaseDir, zipFileName);

// 删除旧的zip文件（如果存在）
if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath);
  console.log(`已删除旧版本: ${zipFileName}`);
}

// 创建zip包
try {
  console.log(`正在创建Chrome商店发布包...`);
  console.log(`版本: ${version}`);
  console.log(`文件名: ${zipFileName}`);
  
  // 使用zip命令压缩dist目录
  const distPath = path.join(__dirname, '../dist');
  if (!fs.existsSync(distPath)) {
    throw new Error('dist目录不存在，请先运行构建命令');
  }
  
  // 切换到dist目录并创建zip包
  process.chdir(distPath);
  execSync(`zip -r "${zipFilePath}" .`, { stdio: 'inherit' });
  
  console.log(`✅ Chrome商店发布包创建成功!`);
  console.log(`📦 文件位置: ${zipFilePath}`);
  console.log(`📏 文件大小: ${(fs.statSync(zipFilePath).size / 1024 / 1024).toFixed(2)} MB`);
  
  // 显示zip包内容
  console.log(`\n📋 包含文件:`);
  execSync(`unzip -l "${zipFilePath}"`, { stdio: 'inherit' });
  
  // 验证必要文件
  const requiredFiles = ['manifest.json', 'background.js', 'content.js', 'popup.html', 'options.html'];
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(distPath, file))) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    console.warn(`⚠️  警告: 以下必要文件缺失:`);
    missingFiles.forEach(file => console.warn(`   - ${file}`));
  } else {
    console.log(`✅ 所有必要文件都已包含`);
  }
  
  console.log(`\n🚀 发布提示:`);
  console.log(`1. 访问 Chrome Web Store Developer Dashboard`);
  console.log(`2. 上传文件: ${zipFileName}`);
  console.log(`3. 填写商店信息并提交审核`);
  
} catch (error) {
  console.error(`❌ 创建zip包失败:`, error.message);
  process.exit(1);
}
