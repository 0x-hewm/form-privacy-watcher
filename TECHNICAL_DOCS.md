# Form Privacy Watcher 技术文档

## 📋 目录

1. [项目概述](#项目概述)
2. [核心功能架构](#核心功能架构)
3. [技术实现要点](#技术实现要点)
4. [安全与隐私机制](#安全与隐私机制)
5. [性能与资源管理](#性能与资源管理)
6. [错误处理与边界场景](#错误处理与边界场景)
7. [数据模糊与脱敏处理](#数据模糊与脱敏处理)
8. [扩展权限需求](#扩展权限需求)

---

## 项目概述

**Form Privacy Watcher** 是一款 Chrome 浏览器扩展，用于实时监控用户在网页表单中输入的数据是否在点击"提交"按钮之前就被网站脚本或第三方脚本访问和泄露出去。

### 目标人群

- **隐私意识用户** - 注重隐私安全的普通用户
- **专业用户** - 媒体、法律、金融等领域需要数据合规保障的专业用户
- **安全研究人员** - 安全研究人员与监管者

### 核心价值

- **揭示灰色行为** - 揭示网站在表单交互中的"灰色行为"
- **用户教育** - 教育用户了解输入数据如何可能被利用
- **最后防线** - 提供浏览器侧的最后一道防线

---

## 核心功能架构

### 表单字段监听

自动注入监听脚本，捕捉页面内所有表单字段元素：

- `<input>` (text、tel、email、password等)
- `<textarea>`
- `<select>`

监听输入事件（input/change/keyup）并记录用户输入值：

```typescript
// 表单字段监听示例
function monitorFormField(element: HTMLInputElement) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
        handleFieldValueChange(element, element.value);
      }
    });
  });
  
  observer.observe(element, {
    attributes: true,
    attributeFilter: ['value']
  });
}
```

### 网络请求拦截

使用 Chrome webRequest API 拦截和分析网络请求：

```typescript
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    analyzeRequestForFormData(details);
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);
```

### 数据匹配算法

实现多种匹配算法确保检测准确性：

1. **完全匹配** - 直接比较原始数据
2. **哈希匹配** - 使用 SHA-256 哈希比较
3. **URL编码匹配** - 处理编码后的数据
4. **模糊匹配** - 处理部分数据泄露

```typescript
interface MatchingStrategy {
  exact: (formData: string, requestData: string) => boolean;
  hash: (formData: string, requestData: string) => boolean;
  encoded: (formData: string, requestData: string) => boolean;
  fuzzy: (formData: string, requestData: string) => boolean;
}
```

---

## 技术实现要点

### 架构设计

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Injected      │    │   Content       │    │   Background    │
│   Script        │───▶│   Script        │───▶│   Script        │
│                 │    │                 │    │                 │
│ • 表单监控      │    │ • 数据过滤      │    │ • 请求分析      │
│ • 字段访问拦截  │    │ • 消息路由      │    │ • 数据匹配      │
│ • 实时检测      │    │ • 事件聚合      │    │ • 存储管理      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Popup/Options │
                    │                 │
                    │ • 状态显示      │
                    │ • 配置管理      │
                    │ • 日志查看      │
                    └─────────────────┘
```

### 组件通信

使用 Chrome Extension Message API 进行组件间通信：

```typescript
// 消息类型定义
interface ExtensionMessage {
  type: 'FORM_DATA_ACCESS' | 'NETWORK_REQUEST' | 'CONFIG_UPDATE';
  data: any;
  timestamp: number;
  tabId?: number;
}

// 发送消息
function sendMessage(message: ExtensionMessage) {
  chrome.runtime.sendMessage(message);
}

// 接收消息
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    switch (message.type) {
      case 'FORM_DATA_ACCESS':
        handleFormDataAccess(message.data);
        break;
      case 'NETWORK_REQUEST':
        handleNetworkRequest(message.data);
        break;
    }
  }
);
```

### 数据流处理

```typescript
// 数据流处理管道
class DataFlowProcessor {
  private pipeline: Array<(data: any) => any> = [];
  
  addStep(processor: (data: any) => any) {
    this.pipeline.push(processor);
  }
  
  process(data: any) {
    return this.pipeline.reduce((current, processor) => {
      return processor(current);
    }, data);
  }
}

// 使用示例
const processor = new DataFlowProcessor();
processor.addStep(sanitizeData);
processor.addStep(analyzeRisk);
processor.addStep(generateAlert);
```

---

## 安全与隐私机制

### 数据本地化

所有敏感数据处理都在浏览器本地完成：

```typescript
class LocalDataProcessor {
  // 不会将数据发送到远程服务器
  private processData(data: any): void {
    // 本地处理逻辑
    const sanitized = this.sanitizeData(data);
    const analyzed = this.analyzeLocally(sanitized);
    this.storeLocally(analyzed);
  }
  
  private sanitizeData(data: any): any {
    // 数据脱敏处理
    return DataSanitizer.sanitize(data);
  }
}
```

### 权限最小化

只申请必要的权限：

```json
{
  "permissions": [
    "storage",
    "activeTab",
    "webRequest"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

### 加密存储

敏感配置数据加密存储：

```typescript
import CryptoJS from 'crypto-js';

class SecureStorage {
  private static readonly SECRET_KEY = 'user-generated-key';
  
  static encrypt(data: any): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), this.SECRET_KEY).toString();
  }
  
  static decrypt(encryptedData: string): any {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.SECRET_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }
}
```

---

## 性能与资源管理

### 内存优化

```typescript
class MemoryManager {
  private cache = new Map<string, any>();
  private readonly MAX_CACHE_SIZE = 1000;
  
  set(key: string, value: any): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // LRU 淘汰策略
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  clear(): void {
    this.cache.clear();
  }
}
```

### 事件节流

```typescript
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay);
    }
  };
}
```

### Web Worker 支持

```typescript
// 在 Web Worker 中处理计算密集型任务
class WorkerManager {
  private worker: Worker;
  
  constructor() {
    this.worker = new Worker('/js/data-processor.worker.js');
  }
  
  processData(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.worker.postMessage(data);
      this.worker.onmessage = (event) => resolve(event.data);
      this.worker.onerror = (error) => reject(error);
    });
  }
}
```

---

## 错误处理与边界场景

### 错误处理机制

```typescript
class ErrorHandler {
  static handle(error: Error, context: string): void {
    console.error(`[${context}] Error:`, error);
    
    // 发送错误报告（仅在开发模式）
    if (process.env.NODE_ENV === 'development') {
      this.reportError(error, context);
    }
  }
  
  private static reportError(error: Error, context: string): void {
    chrome.storage.local.get(['errorLogs'], (result) => {
      const errorLogs = result.errorLogs || [];
      errorLogs.push({
        error: error.message,
        context,
        timestamp: Date.now(),
        stack: error.stack
      });
      
      // 保留最近的 100 条错误日志
      if (errorLogs.length > 100) {
        errorLogs.splice(0, errorLogs.length - 100);
      }
      
      chrome.storage.local.set({ errorLogs });
    });
  }
}
```

### 边界场景处理

```typescript
class BoundaryHandler {
  // 处理动态表单
  static handleDynamicForms(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const forms = element.querySelectorAll('form, input, textarea, select');
            forms.forEach((form) => this.attachFormMonitor(form));
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // 处理 Shadow DOM
  static handleShadowDOM(): void {
    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(options) {
      const shadowRoot = originalAttachShadow.call(this, options);
      BoundaryHandler.monitorShadowRoot(shadowRoot);
      return shadowRoot;
    };
  }
}
```

---

## 数据模糊与脱敏处理

### 脱敏规则

```typescript
class DataSanitizer {
  private static readonly PATTERNS = {
    phone: /(\d{3})\d{4}(\d{4})/,
    email: /(.{2})[^@]*(@.+)/,
    idCard: /(\d{6})\d{8}(\d{4})/,
    creditCard: /(\d{4})\s?\d{4}\s?\d{4}\s?(\d{4})/
  };
  
  static sanitize(value: string, type: string): string {
    switch (type) {
      case 'phone':
        return value.replace(this.PATTERNS.phone, '$1****$2');
      case 'email':
        return value.replace(this.PATTERNS.email, '$1***$2');
      case 'idCard':
        return value.replace(this.PATTERNS.idCard, '$1********$2');
      case 'creditCard':
        return value.replace(this.PATTERNS.creditCard, '$1 **** **** $2');
      default:
        return this.genericSanitize(value);
    }
  }
  
  private static genericSanitize(value: string): string {
    if (value.length <= 4) return '***';
    const start = value.substring(0, 2);
    const end = value.substring(value.length - 2);
    const middle = '*'.repeat(value.length - 4);
    return start + middle + end;
  }
}
```

### 哈希处理

```typescript
import CryptoJS from 'crypto-js';

class HashProcessor {
  static generateHash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }
  
  static compareHash(data: string, hash: string): boolean {
    return this.generateHash(data) === hash;
  }
  
  static generateSalt(): string {
    return CryptoJS.lib.WordArray.random(16).toString();
  }
  
  static hashWithSalt(data: string, salt: string): string {
    return CryptoJS.SHA256(data + salt).toString();
  }
}
```

---

## 扩展权限需求

### 必需权限

```json
{
  "permissions": [
    "storage",           // 存储配置和日志
    "activeTab",         // 访问当前活动标签
    "webRequest",        // 拦截网络请求
    "webRequestBlocking" // 阻塞请求分析
  ],
  "host_permissions": [
    "<all_urls>"         // 访问所有网站
  ]
}
```

### 权限使用说明

1. **storage** - 存储用户配置、白名单、检测日志
2. **activeTab** - 获取当前标签页信息，注入监控脚本
3. **webRequest** - 拦截分析网络请求，检测数据泄露
4. **host_permissions** - 在所有网站上运行监控功能

### 权限安全性

- 严格遵循最小权限原则
- 只在必要时访问敏感数据
- 所有数据处理都在本地完成
- 不向第三方服务器发送任何数据

---

## 总结

Form Privacy Watcher 通过先进的技术架构和严格的安全机制，为用户提供了一个可靠的表单隐私保护解决方案。项目采用模块化设计，易于维护和扩展，同时确保了高性能和低资源占用。

### 核心技术优势

1. **实时监控** - 无延迟的表单数据访问检测
2. **智能分析** - 多种算法确保检测准确性
3. **隐私保护** - 100% 本地处理，零数据泄露
4. **高性能** - 优化的资源使用和内存管理
5. **可扩展** - 模块化架构支持功能扩展

### 未来发展

- 支持更多浏览器平台
- 增强 AI 辅助检测能力
- 扩展企业级功能
- 建设开源社区生态

---

**技术文档持续更新中，欢迎贡献和反馈！**
