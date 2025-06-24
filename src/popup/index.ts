import { Message, MessageResponse, PrivacyViolation, DetectionStats, ExtensionSettings } from '@/types';

// Import CSS file for webpack to process
import './popup.css';

class PopupController {
  private currentTab: chrome.tabs.Tab | null = null;
  private stats: DetectionStats | null = null;
  private settings: ExtensionSettings | null = null;
  private violations: PrivacyViolation[] = [];

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadCurrentTab();
    await this.loadData();
    this.setupEventListeners();
    this.render();
  }

  private async loadCurrentTab(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
    } catch (error) {
      console.error('Failed to get current tab:', error);
    }
  }

  private async loadData(): Promise<void> {
    try {
      // 并行加载数据
      const [statsResponse, settingsResponse, violationsResponse] = await Promise.all([
        this.sendMessage({ type: 'GET_STATS' }),
        this.sendMessage({ type: 'GET_SETTINGS' }),
        this.sendMessage({ type: 'GET_VIOLATIONS' })
      ]);

      this.stats = statsResponse.data;
      this.settings = settingsResponse.data;
      this.violations = violationsResponse.data || [];
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  private setupEventListeners(): void {
    // 启用/禁用切换
    const enabledToggle = document.getElementById('enabledToggle') as HTMLInputElement;
    enabledToggle?.addEventListener('change', this.handleToggleEnabled.bind(this));

    // 信任站点按钮
    const addWhitelistBtn = document.getElementById('addWhitelistBtn');
    addWhitelistBtn?.addEventListener('click', this.handleAddWhitelist.bind(this));

    // 查看日志按钮
    const viewLogsBtn = document.getElementById('viewLogsBtn');
    viewLogsBtn?.addEventListener('click', this.handleViewLogs.bind(this));

    // 设置按钮
    const settingsBtn = document.getElementById('settingsBtn');
    settingsBtn?.addEventListener('click', this.handleOpenSettings.bind(this));

    // 帮助按钮
    const helpBtn = document.getElementById('helpBtn');
    helpBtn?.addEventListener('click', this.handleOpenHelp.bind(this));

    // 模态框事件
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');
    const modalWhitelist = document.getElementById('modalWhitelist');
    
    modalClose?.addEventListener('click', this.hideModal.bind(this));
    modalCancel?.addEventListener('click', this.hideModal.bind(this));
    modalWhitelist?.addEventListener('click', this.handleModalWhitelist.bind(this));

    // 点击模态框外部关闭
    const modal = document.getElementById('violationModal');
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideModal();
      }
    });
  }

  private render(): void {
    this.renderStats();
    this.renderCurrentPage();
    this.renderViolations();
    this.renderSettings();
  }

  private renderStats(): void {
    if (!this.stats) return;

    const todayElement = document.getElementById('todayViolations');
    const totalElement = document.getElementById('totalViolations');
    const whitelistElement = document.getElementById('whitelistedSites');

    if (todayElement) todayElement.textContent = this.stats.todayViolations.toString();
    if (totalElement) totalElement.textContent = this.stats.totalViolations.toString();
    if (whitelistElement) whitelistElement.textContent = this.stats.whitelistedSites.toString();
  }

  private renderCurrentPage(): void {
    const urlElement = document.getElementById('currentUrl');
    const statusElement = document.getElementById('pageStatus');
    const statusIndicator = document.getElementById('statusIndicator');

    if (!this.currentTab || !urlElement || !statusElement || !statusIndicator) return;

    // 显示当前URL
    const url = this.currentTab.url || '';
    try {
      const urlObj = new URL(url);
      urlElement.textContent = urlObj.hostname + urlObj.pathname;
    } catch {
      urlElement.textContent = url;
    }

    // 检查页面状态
    const isWhitelisted = this.isCurrentPageWhitelisted();
    const hasRecentViolations = this.getRecentViolationsForCurrentTab().length > 0;

    let statusText = '安全';
    let statusClass = 'safe';
    let indicatorClass = '';
    let indicatorText = '监控中';

    if (isWhitelisted) {
      statusText = '已信任';
      statusClass = 'warning';
      indicatorClass = 'warning';
      indicatorText = '白名单';
    } else if (hasRecentViolations) {
      statusText = '检测到风险';
      statusClass = 'danger';
      indicatorClass = 'danger';
      indicatorText = '有风险';
    }

    // 更新状态显示
    const statusBadge = statusElement.querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.className = `status-badge ${statusClass}`;
      statusBadge.textContent = statusText;
    }

    // 更新指示器
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusTextEl = statusIndicator.querySelector('.status-text');
    if (statusDot) statusDot.className = `status-dot ${indicatorClass}`;
    if (statusTextEl) statusTextEl.textContent = indicatorText;
  }

  private renderViolations(): void {
    const violationsList = document.getElementById('violationsList');
    if (!violationsList) return;

    const recentViolations = this.getRecentViolationsForCurrentTab();

    if (recentViolations.length === 0) {
      violationsList.innerHTML = `
        <div class="no-violations">
          <img src="icons/shield-check.svg" alt="安全">
          <p>暂无隐私风险检测</p>
        </div>
      `;
      return;
    }

    violationsList.innerHTML = recentViolations
      .slice(0, 3) // 只显示最近3个
      .map(violation => this.createViolationElement(violation))
      .join('');

    // 添加点击事件
    violationsList.querySelectorAll('.violation-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        this.showViolationDetails(recentViolations[index]);
      });
    });
  }

  private renderSettings(): void {
    if (!this.settings) return;

    const enabledToggle = document.getElementById('enabledToggle') as HTMLInputElement;
    if (enabledToggle) {
      enabledToggle.checked = this.settings.enabled;
    }
  }

  private createViolationElement(violation: PrivacyViolation): string {
    const timeAgo = this.formatTimeAgo(violation.timestamp);
    const domain = this.extractDomain(violation.targetUrl || violation.url);
    const icon = this.getSeverityIcon(violation.severity);

    return `
      <div class="violation-item">
        <div class="violation-icon">
          <img src="icons/${icon}" alt="${violation.severity}" class="severity-icon">
        </div>
        <div class="violation-content">
          <div class="violation-field">${violation.fieldType} 字段泄露</div>
          <div class="violation-target">发送至: ${domain}</div>
        </div>
        <div class="violation-time">${timeAgo}</div>
      </div>
    `;
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'danger.svg';
      case 'medium':
        return 'warning.svg';
      case 'low':
      default:
        return 'shield-check.svg';
    }
  }

  private async handleToggleEnabled(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const enabled = target.checked;

    try {
      await this.sendMessage({
        type: 'UPDATE_SETTINGS',
        data: { enabled }
      });
      
      if (this.settings) {
        this.settings.enabled = enabled;
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      // 回滚UI状态
      target.checked = !enabled;
    }
  }

  private async handleAddWhitelist(): Promise<void> {
    if (!this.currentTab?.url) return;

    try {
      const url = new URL(this.currentTab.url);
      const entry = {
        domain: url.hostname,
        addedAt: Date.now(),
        reason: '用户手动添加'
      };

      await this.sendMessage({
        type: 'ADD_WHITELIST',
        data: entry
      });

      // 重新加载数据
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Failed to add to whitelist:', error);
    }
  }

  private handleViewLogs(): void {
    chrome.runtime.openOptionsPage();
  }

  private handleOpenSettings(): void {
    chrome.runtime.openOptionsPage();
  }

  private handleOpenHelp(): void {
    chrome.tabs.create({
      url: 'https://github.com/0x-hewm/form-privacy-watcher/blob/main/README.md'
    });
  }

  private showViolationDetails(violation: PrivacyViolation): void {
    const modal = document.getElementById('violationModal');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) return;

    modalBody.innerHTML = `
      <div class="detail-item">
        <div class="detail-label">字段类型</div>
        <div class="detail-value">${violation.fieldType}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">敏感数据</div>
        <div class="detail-value">${violation.sensitizedValue}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">目标URL</div>
        <div class="detail-value">${violation.targetUrl}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">请求方式</div>
        <div class="detail-value">${violation.requestMethod}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">脚本来源</div>
        <div class="detail-value">${violation.scriptOrigin}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">风险等级</div>
        <div class="detail-value">
          <span class="status-badge ${violation.severity}">${this.getSeverityText(violation.severity)}</span>
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-label">检测时间</div>
        <div class="detail-value">${new Date(violation.timestamp).toLocaleString()}</div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  private hideModal(): void {
    const modal = document.getElementById('violationModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  private async handleModalWhitelist(): Promise<void> {
    await this.handleAddWhitelist();
    this.hideModal();
  }

  private isCurrentPageWhitelisted(): boolean {
    if (!this.currentTab?.url || !this.settings) return false;

    try {
      const url = new URL(this.currentTab.url);
      return this.settings.whitelist.some(entry => 
        url.hostname.endsWith(entry.domain)
      );
    } catch {
      return false;
    }
  }

  private getRecentViolationsForCurrentTab(): PrivacyViolation[] {
    if (!this.currentTab?.url) return [];

    const cutoff = Date.now() - 3600000; // 1小时内
    return this.violations.filter(violation => 
      violation.timestamp > cutoff
      // 可以根据当前标签页URL进一步过滤
    );
  }

  private formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  private getSeverityText(severity: string): string {
    const map: Record<string, string> = {
      low: '低风险',
      medium: '中等风险', 
      high: '高风险',
      critical: '严重风险'
    };
    return map[severity] || severity;
  }

  private async sendMessage(message: Message): Promise<MessageResponse> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: MessageResponse) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response?.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    });
  }
}

// 初始化弹窗
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
