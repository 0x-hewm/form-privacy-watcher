import { 
  Message, 
  MessageResponse, 
  PrivacyViolation, 
  NetworkRequest, 
  ExtensionSettings,
  DetectionStats,
  WhitelistEntry 
} from '@/types';
import { DataSanitizer } from '@/utils/dataSanitizer';

class BackgroundService {
  private violations: Map<string, PrivacyViolation> = new Map();
  private pendingRequests: Map<string, NetworkRequest> = new Map();
  private settings: ExtensionSettings = this.getDefaultSettings();
  private stats: DetectionStats = {
    totalViolations: 0,
    todayViolations: 0,
    blockedRequests: 0,
    whitelistedSites: 0
  };

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // 加载存储的设置
    await this.loadSettings();
    
    // 设置消息监听器
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // 设置网络请求监听器
    chrome.webRequest.onBeforeRequest.addListener(
      this.handleNetworkRequest.bind(this),
      { urls: ['<all_urls>'] },
      ['requestBody']
    );

    chrome.webRequest.onBeforeSendHeaders.addListener(
      this.handleRequestHeaders.bind(this),
      { urls: ['<all_urls>'] },
      ['requestHeaders']
    );

    // 设置标签页更新监听器
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    
    // 每天重置统计
    this.setupDailyReset();
    
    console.log('Form Privacy Watcher: Background service initialized');
  }

  private getDefaultSettings(): ExtensionSettings {
    return {
      enabled: true,
      loggingEnabled: true, // 修改为默认开启日志记录
      notificationsEnabled: true,
      sensitivityLevel: 'medium',
      whitelist: [],
      maxLogEntries: 100
    };
  }

  private async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['settings', 'violations', 'stats']);
      
      if (result.settings) {
        this.settings = { ...this.getDefaultSettings(), ...result.settings };
      }
      
      if (result.violations) {
        this.violations = new Map(result.violations);
      }
      
      if (result.stats) {
        this.stats = { ...this.stats, ...result.stats };
      }
      
      // 同步统计数据，确保与实际数据一致
      this.syncStats();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await chrome.storage.sync.set({
        settings: this.settings,
        violations: Array.from(this.violations.entries()),
        stats: this.stats
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  private handleMessage(
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): boolean {
    const tabId = sender.tab?.id;
    
    switch (message.type) {
      case 'FIELD_ACCESSED':
        this.handleFieldAccessed(message.data, tabId);
        break;
        
      case 'GET_SETTINGS':
        sendResponse({ success: true, data: this.settings });
        break;
        
      case 'UPDATE_SETTINGS':
        this.updateSettings(message.data).then(() => {
          sendResponse({ success: true });
        });
        break;
        
      case 'GET_VIOLATIONS':
        console.log('GET_VIOLATIONS requested');
        console.log('Total violations in storage:', this.violations.size);
        console.log('Sample violations:', Array.from(this.violations.values()).slice(0, 3));
        console.log('Logging enabled:', this.settings.loggingEnabled);
        
        const violationsArray = Array.from(this.violations.values())
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, this.settings.maxLogEntries);
          
        console.log('Returning violations count:', violationsArray.length);
        
        sendResponse({ 
          success: true, 
          data: violationsArray
        });
        break;

      case 'UPDATE_VIOLATIONS':
        this.updateViolations(message.data).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          console.error('Failed to update violations:', error);
          sendResponse({ success: false, error: error.message });
        });
        break;
        
      case 'GET_STATS':
        // 每次获取统计数据时，都同步最新的统计
        this.syncStats();
        sendResponse({ success: true, data: this.stats });
        break;
        
      case 'ADD_WHITELIST':
        this.addToWhitelist(message.data).then(() => {
          sendResponse({ success: true });
        });
        break;
        
      case 'REMOVE_WHITELIST':
        this.removeFromWhitelist(message.data).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          console.error('Failed to remove from whitelist:', error);
          sendResponse({ success: false, error: error.message });
        });
        break;
        
      case 'CLEAR_LOGS':
        this.clearLogs().then(() => {
          sendResponse({ success: true });
        });
        break;
        
      case 'EXPORT_LOGS':
        sendResponse({ 
          success: true, 
          data: this.exportLogs() 
        });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
    
    return true; // 保持消息通道开放
  }

  private async handleFieldAccessed(data: any, tabId?: number): Promise<void> {
    if (!this.settings.enabled || !tabId) return;

    const { field, accessEvent } = data;
    
    // 检查是否在白名单中
    const tab = await chrome.tabs.get(tabId);
    if (this.isWhitelisted(tab.url || '')) return;
    
    // 修复：即使不是敏感字段，也要检测访问行为
    const isSensitive = DataSanitizer.isSensitive(field.name) || 
                       DataSanitizer.isSensitiveValue(field.value, field.type);

    // 创建违规记录
    const violation: PrivacyViolation = {
      id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      url: tab.url || '',
      domain: new URL(tab.url || 'about:blank').hostname,
      fieldName: field.name,
      fieldType: field.type,
      violationType: isSensitive ? 'sensitive-field-access' : 'field-access',
      severity: isSensitive ? 'high' : 'medium',
      description: `表单字段 "${field.name}" 被第三方脚本访问`,
      stackTrace: accessEvent.stackTrace,
      scriptOrigin: accessEvent.scriptOrigin,
      details: {
        fieldId: field.id,
        accessType: accessEvent.accessType,
        sanitizedValue: DataSanitizer.sanitize(field.value, field.type)
      }
    };

    this.recordViolation(violation);
    this.notifyUser(violation, tabId);
  }

  private handleNetworkRequest(
    details: chrome.webRequest.WebRequestBodyDetails
  ): chrome.webRequest.BlockingResponse | void {
    if (!this.settings.enabled) return;

    const request: NetworkRequest = {
      url: details.url,
      method: details.method,
      headers: {},
      body: details.requestBody ? this.extractRequestBody(details.requestBody) : undefined,
      timestamp: Date.now(),
      initiator: details.initiator,
      tabId: details.tabId
    };

    // 存储请求用于后续匹配
    const requestId = `${details.tabId}_${Date.now()}_${Math.random()}`;
    this.pendingRequests.set(requestId, request);
    
    // 清理旧请求
    this.cleanupOldRequests();
  }

  private handleRequestHeaders(
    details: chrome.webRequest.WebRequestHeadersDetails
  ): chrome.webRequest.BlockingResponse | void {
    if (!this.settings.enabled) return;

    // 找到对应的请求并添加头信息
    const request = Array.from(this.pendingRequests.values())
      .find(r => r.tabId === details.tabId && Math.abs(r.timestamp - Date.now()) < 5000);

    if (request && details.requestHeaders) {
      details.requestHeaders.forEach(header => {
        request.headers[header.name || ''] = header.value || '';
      });
    }
  }

  private handleTabUpdate(
    tabId: number, 
    changeInfo: chrome.tabs.TabChangeInfo, 
    tab: chrome.tabs.Tab
  ): void {
    if (changeInfo.status === 'complete' && tab.url) {
      this.updateBadge(tabId, tab.url);
    }
  }

  private extractRequestBody(requestBody: chrome.webRequest.WebRequestBody): string {
    if (!requestBody || !requestBody.raw) return '';
    
    const decoder = new TextDecoder();
    return requestBody.raw
      .map(data => data.bytes ? decoder.decode(data.bytes) : '')
      .join('');
  }

  private async findMatchingRequests(
    field: any, 
    accessEvent: any, 
    tabId: number
  ): Promise<PrivacyViolation[]> {
    const violations: PrivacyViolation[] = [];
    const fieldHashes = DataSanitizer.createPartialHash(field.value);
    const fullHash = DataSanitizer.createHash(field.value);
    
    // 在最近的网络请求中查找匹配
    const recentRequests = Array.from(this.pendingRequests.values())
      .filter(req => req.tabId === tabId && Date.now() - req.timestamp < 30000);

    for (const request of recentRequests) {
      const matchLevel = this.checkDataMatch(request, field.value, fieldHashes, fullHash);
      
      if (matchLevel > 0) {
        const violation: PrivacyViolation = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          url: request.url,
          domain: new URL(request.url).hostname,
          fieldName: field.name,
          fieldType: field.type,
          violationType: 'data_transmission',
          severity: this.calculateSeverity(matchLevel, field.type),
          description: `表单数据 ${field.name} 被检测到传输`,
          stackTrace: accessEvent.stackTrace,
          scriptOrigin: accessEvent.scriptOrigin,
          targetUrl: request.url,
          sensitizedValue: DataSanitizer.sanitize(field.value, field.type),
          requestMethod: request.method,
          details: {
            fieldId: field.id,
            accessType: accessEvent.accessType,
            sanitizedValue: DataSanitizer.sanitize(field.value, field.type)
          }
        };
        
        violations.push(violation);
      }
    }
    
    return violations;
  }

  private checkDataMatch(
    request: NetworkRequest, 
    fieldValue: string, 
    fieldHashes: string[], 
    fullHash: string
  ): number {
    const searchText = `${request.url} ${request.body || ''} ${JSON.stringify(request.headers)}`;
    
    // 完全匹配
    if (searchText.includes(fieldValue)) return 100;
    
    // 哈希匹配
    if (searchText.includes(fullHash)) return 90;
    
    // 部分哈希匹配
    for (const hash of fieldHashes) {
      if (searchText.includes(hash)) return 70;
    }
    
    // URL编码匹配
    const encoded = encodeURIComponent(fieldValue);
    if (searchText.includes(encoded)) return 80;
    
    return 0;
  }

  private calculateSeverity(matchLevel: number, fieldType: string): 'low' | 'medium' | 'high' | 'critical' {
    const sensitiveTypes = ['password', 'ssn', 'credit-card'];
    
    if (sensitiveTypes.includes(fieldType)) {
      return matchLevel > 80 ? 'critical' : 'high';
    }
    
    if (matchLevel > 90) return 'high';
    if (matchLevel > 70) return 'medium';
    return 'low';
  }

  private isWhitelisted(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.settings.whitelist.some(entry => {
        if (entry.path) {
          return urlObj.hostname === entry.domain && urlObj.pathname.startsWith(entry.path);
        }
        return urlObj.hostname === entry.domain || 
               (entry.domain.startsWith('*.') && urlObj.hostname.endsWith(entry.domain.slice(2)));
      });
    } catch {
      return false;
    }
  }

  private recordViolation(violation: PrivacyViolation): void {
    // 始终存储到内存用于统计，即使日志记录被禁用
    this.violations.set(violation.id, violation);
    
    if (this.settings.loggingEnabled) {
      console.log('Form Privacy Watcher: Violation recorded and logged', violation);
    } else {
      console.log('Form Privacy Watcher: Violation detected but not logged (logging disabled)', {
        type: violation.violationType,
        severity: violation.severity,
        url: violation.url
      });
    }
    
    // 保存到存储
    this.saveSettings();
    
    // 通知所有打开的 options 页面实时更新
    this.notifyOptionsPages(violation);
  }

  private notifyOptionsPages(violation: PrivacyViolation): void {
    // 向所有扩展页面发送违规更新消息
    chrome.runtime.sendMessage({
      type: 'VIOLATION_UPDATED',
      data: {
        violation: violation,
        totalViolations: this.violations.size,
        stats: this.stats
      }
    }).catch(() => {
      // 忽略没有接收器的错误（当 options 页面未打开时）
    });

    // 获取所有扩展页面
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && tab.url.includes('options.html')) {
          chrome.tabs.sendMessage(tab.id!, {
            type: 'VIOLATION_UPDATED',
            data: {
              violation: violation,
              totalViolations: this.violations.size,
              stats: this.stats
            }
          }).catch(() => {
            // 忽略消息发送失败的错误
          });
        }
      });
    });
  }

  private async notifyUser(violation: PrivacyViolation, tabId: number): Promise<void> {
    if (!this.settings.notificationsEnabled) return;
    
    try {
      // 发送桌面通知
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Form Privacy Watcher 检测到隐私风险',
        message: `网站 ${violation.domain} 可能在未经授权的情况下访问了您的表单数据: ${violation.fieldName}`,
        priority: violation.severity === 'critical' ? 2 : 1
      });
      
      // 更新徽章
      this.updateBadge(tabId, violation.url);
      
    } catch (error) {
      console.error('Failed to notify user:', error);
    }
  }

  private updateBadge(tabId: number, url: string): void {
    const domain = new URL(url).hostname;
    const violationCount = Array.from(this.violations.values())
      .filter(v => v.domain === domain).length;
    
    if (violationCount > 0) {
      chrome.action.setBadgeText({
        text: violationCount > 99 ? '99+' : violationCount.toString(),
        tabId
      });
      chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }

  private cleanupOldRequests(): void {
    const cutoff = Date.now() - 60000; // 清理1分钟前的请求
    for (const [id, request] of this.pendingRequests.entries()) {
      if (request.timestamp < cutoff) {
        this.pendingRequests.delete(id);
      }
    }
  }

  private setupDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.stats.todayViolations = 0;
      this.saveSettings();
      
      // 设置每日重置
      setInterval(() => {
        this.stats.todayViolations = 0;
        this.saveSettings();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  private async updateSettings(newSettings: Partial<ExtensionSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    this.syncStats();
    await this.saveSettings();
  }

  private async addToWhitelist(entry: WhitelistEntry): Promise<void> {
    this.settings.whitelist.push(entry);
    this.syncStats();
    await this.saveSettings();
  }

  private async removeFromWhitelist(data: {domain: string, path?: string} | string): Promise<void> {
    // 兼容旧的字符串格式和新的对象格式
    let targetDomain: string;
    let targetPath: string | undefined;
    
    if (typeof data === 'string') {
      // 旧格式：只有域名
      targetDomain = data;
      targetPath = undefined;
    } else {
      // 新格式：域名+路径
      targetDomain = data.domain;
      targetPath = data.path;
    }
    
    console.log('removeFromWhitelist called with:', { targetDomain, targetPath });
    
    // 精确匹配删除：域名必须完全匹配，路径也必须匹配（包括 undefined/empty 的情况）
    const beforeCount = this.settings.whitelist.length;
    this.settings.whitelist = this.settings.whitelist.filter(entry => {
      const domainMatch = entry.domain === targetDomain;
      const pathMatch = (entry.path || '') === (targetPath || '');
      const shouldRemove = domainMatch && pathMatch;
      
      if (shouldRemove) {
        console.log('Removing whitelist entry:', { domain: entry.domain, path: entry.path });
      }
      
      return !shouldRemove;
    });
    
    const afterCount = this.settings.whitelist.length;
    const removedCount = beforeCount - afterCount;
    
    console.log(`Whitelist removal result: ${removedCount} entries removed (${beforeCount} -> ${afterCount})`);
    
    if (removedCount === 0) {
      throw new Error(`No matching whitelist entry found for domain: ${targetDomain}, path: ${targetPath || 'none'}`);
    }
    
    this.syncStats();
    await this.saveSettings();
  }

  private async clearLogs(): Promise<void> {
    this.violations.clear();
    // 清除后同步统计数据
    this.syncStats();
    await this.saveSettings();
  }

  private exportLogs(): string {
    const logs = Array.from(this.violations.values())
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      totalLogs: logs.length,
      logs
    }, null, 2);
  }

  // 动态计算统计数据，确保准确性
  private calculateCurrentStats(): DetectionStats {
    const today = new Date().toDateString();
    let todayCount = 0;
    let totalCount = 0;
    
    // 遍历所有violations，动态计算准确的统计数据
    for (const [, violation] of this.violations) {
      totalCount++;
      const violationDate = new Date(violation.timestamp).toDateString();
      if (violationDate === today) {
        todayCount++;
      }
    }
    
    // 计算去重后的白名单站点数量，与options页面保持一致
    const uniqueWhitelistCount = this.deduplicateWhitelist(this.settings.whitelist).length;
    
    return {
      totalViolations: totalCount,
      todayViolations: todayCount,
      blockedRequests: this.stats.blockedRequests, // 这个保持原有逻辑
      whitelistedSites: uniqueWhitelistCount
    };
  }

  // 白名单去重逻辑，与options页面保持一致
  private deduplicateWhitelist(whitelist: WhitelistEntry[]): WhitelistEntry[] {
    const seen = new Set<string>();
    return whitelist.filter(entry => {
      const key = `${entry.domain}|${entry.path || ''}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // 同步统计数据，确保缓存与实际数据一致
  private syncStats(): void {
    const currentStats = this.calculateCurrentStats();
    this.stats = { ...this.stats, ...currentStats };
    console.log('Stats synced:', this.stats);
  }

  private async updateViolations(newViolations: PrivacyViolation[]): Promise<void> {
    // 更新违规记录列表
    this.violations.clear();
    newViolations.forEach(violation => {
      this.violations.set(violation.id, violation);
    });
    
    // 同步统计数据
    this.syncStats();
    
    // 保存到存储
    await this.saveSettings();
  }
}

// 初始化背景服务
new BackgroundService();
