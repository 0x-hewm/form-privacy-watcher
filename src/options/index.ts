import { 
  Message, 
  MessageResponse, 
  ExtensionSettings, 
  PrivacyViolation,
  DetectionStats,
  WhitelistEntry 
} from '@/types';

// Import CSS file for webpack to process
import './options.css';

class OptionsController {
  private settings: ExtensionSettings | null = null;
  private violations: PrivacyViolation[] = [];
  private stats: DetectionStats | null = null;
  private filteredViolations: PrivacyViolation[] = [];
  private filteredWhitelist: WhitelistEntry[] = [];
  private currentSortBy: string = 'time-desc';
  private currentViewType: 'detailed' | 'compact' | 'grouped' = 'detailed';
  private deduplicationEnabled: boolean = true;
  private timeWindowMs: number = 5000; // 5秒时间窗口用于去重
  private smartWhitelistSuggestions: Set<string> = new Set();
  private falsePositiveReports: Set<string> = new Set();
  private selectedViolationIds: Set<string> = new Set();

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadData();
    this.setupEventListeners();
    this.setupTabs();
    this.render();
    
    // 设置定期刷新机制（每30秒检查一次新数据）
    this.setupPeriodicRefresh();
  }

  private async loadData(): Promise<void> {
    try {
      console.log('Loading data...');
      const [settingsResponse, violationsResponse, statsResponse] = await Promise.all([
        this.sendMessage({ type: 'GET_SETTINGS' }),
        this.sendMessage({ type: 'GET_VIOLATIONS' }),
        this.sendMessage({ type: 'GET_STATS' })
      ]);

      console.log('Data responses:', {
        settings: settingsResponse,
        violations: violationsResponse,
        stats: statsResponse
      });

      this.settings = settingsResponse.data;
      this.violations = violationsResponse.data || [];
      this.stats = statsResponse.data;
      
      console.log('Loaded violations count:', this.violations.length);
      console.log('Sample violations:', this.violations.slice(0, 3));
      
      this.violations = this.deduplicationEnabled ? this.filterDuplicates(this.violations) : this.violations;
      this.filteredViolations = [...this.violations];
      this.filteredWhitelist = this.settings ? [...this.settings.whitelist] : [];
      
      console.log('After filtering - violations count:', this.violations.length);
      console.log('Filtered violations count:', this.filteredViolations.length);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  private setupEventListeners(): void {
    // 设置消息监听器，接收实时更新
    chrome.runtime.onMessage.addListener(this.handleRuntimeMessage.bind(this));
    
    // 设置保存
    document.getElementById('saveSettings')?.addEventListener('click', this.handleSaveSettings.bind(this));
    document.getElementById('resetSettings')?.addEventListener('click', this.handleResetSettings.bind(this));
    document.getElementById('exportSettings')?.addEventListener('click', this.handleExportSettings.bind(this));

    // 白名单管理
    document.getElementById('addWhitelistEntry')?.addEventListener('click', this.showAddWhitelistModal.bind(this));
    document.getElementById('whitelistSearch')?.addEventListener('input', this.handleWhitelistSearch.bind(this));

    // 日志管理基本功能
    document.getElementById('refreshLogs')?.addEventListener('click', this.handleRefreshLogs.bind(this));
    document.getElementById('exportLogs')?.addEventListener('click', this.handleExportLogs.bind(this));
    document.getElementById('clearLogs')?.addEventListener('click', this.handleClearLogs.bind(this));
    document.getElementById('logsSearch')?.addEventListener('input', this.handleLogsSearch.bind(this));
    
    // 日志过滤和排序
    document.getElementById('severityFilter')?.addEventListener('change', this.handleLogsFilter.bind(this));
    document.getElementById('typeFilter')?.addEventListener('change', this.handleLogsFilter.bind(this));
    document.getElementById('timeFilter')?.addEventListener('change', this.handleLogsFilter.bind(this));
    document.getElementById('sourceFilter')?.addEventListener('change', this.handleLogsFilter.bind(this));
    document.getElementById('sortBy')?.addEventListener('change', this.handleLogsSort.bind(this));
    
    // 去重和过滤设置
    document.getElementById('deduplicationEnabled')?.addEventListener('change', this.handleDeduplicationToggle.bind(this));
    document.getElementById('timeWindow')?.addEventListener('change', this.handleTimeWindowChange.bind(this));
    document.getElementById('hideFalsePositives')?.addEventListener('change', this.handleLogsFilter.bind(this));
    
    // 高级搜索
    document.getElementById('advancedSearch')?.addEventListener('click', this.toggleAdvancedSearch.bind(this));
    document.getElementById('applyAdvancedSearch')?.addEventListener('click', this.handleAdvancedSearch.bind(this));
    document.getElementById('resetAdvancedSearch')?.addEventListener('click', this.resetAdvancedSearch.bind(this));
    
    // 重置筛选
    document.getElementById('resetAllFilters')?.addEventListener('click', this.handleResetAllFilters.bind(this));
    
    // 视图切换
    document.getElementById('viewDetailed')?.addEventListener('click', () => this.changeLogsView('detailed'));
    document.getElementById('viewCompact')?.addEventListener('click', () => this.changeLogsView('compact'));
    document.getElementById('viewGrouped')?.addEventListener('click', () => this.changeLogsView('grouped'));
    
    // 批量操作
    document.getElementById('selectAllCheckbox')?.addEventListener('change', this.handleSelectAll.bind(this));
    document.getElementById('bulkDelete')?.addEventListener('click', this.handleBulkDelete.bind(this));
    document.getElementById('bulkMarkFalsePositive')?.addEventListener('click', this.handleBulkMarkFalsePositive.bind(this));
    document.getElementById('bulkAddToWhitelist')?.addEventListener('click', this.handleBulkAddToWhitelist.bind(this));
    document.getElementById('bulkIgnoreType')?.addEventListener('click', this.handleBulkIgnoreType.bind(this));
    document.getElementById('cancelBulkSelection')?.addEventListener('click', this.handleCancelBulkSelection.bind(this));
    
    // 日志条目交互事件将在renderLogs中动态绑定

    // 模态框事件
    this.setupModalEvents();
  }

  private setupModalEvents(): void {
    const modal = document.getElementById('addWhitelistModal');
    const closeBtn = document.getElementById('whitelistModalClose');
    const cancelBtn = document.getElementById('whitelistModalCancel');
    const saveBtn = document.getElementById('whitelistModalSave');

    console.log('Setting up modal events:', { modal, closeBtn, cancelBtn, saveBtn });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('Close button clicked');
        this.hideAddWhitelistModal();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        console.log('Cancel button clicked');
        this.hideAddWhitelistModal();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        console.log('Save button clicked');
        e.preventDefault(); // 防止表单默认提交
        e.stopPropagation(); // 停止事件冒泡
        this.handleSaveWhitelist();
      });
    }

    // 点击背景关闭
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          console.log('Modal background clicked');
          this.hideAddWhitelistModal();
        }
      });

      // 键盘支持
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          console.log('Escape key pressed');
          this.hideAddWhitelistModal();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          console.log('Ctrl+Enter pressed');
          e.preventDefault(); // 防止表单默认提交
          e.stopPropagation(); // 停止事件冒泡
          // Ctrl+Enter 或 Cmd+Enter 快速提交
          this.handleSaveWhitelist();
        }
      });
    }

    // 为输入框添加实时验证和键盘事件
    const domainInput = document.getElementById('whitelistDomain') as HTMLInputElement;
    if (domainInput) {
      domainInput.addEventListener('input', this.validateDomainInput.bind(this));
      domainInput.addEventListener('blur', this.validateDomainInput.bind(this));
      
      // 阻止输入框中的回车键直接触发保存，只允许 Ctrl+Enter
      domainInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          // 可以聚焦到下一个输入框
          const pathInput = document.getElementById('whitelistPath') as HTMLInputElement;
          if (pathInput) {
            pathInput.focus();
          }
        }
      });
    }

    // 为路径输入框也添加类似处理
    const pathInput = document.getElementById('whitelistPath') as HTMLInputElement;
    if (pathInput) {
      pathInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          // 聚焦到原因输入框
          const reasonInput = document.getElementById('whitelistReason') as HTMLInputElement;
          if (reasonInput) {
            reasonInput.focus();
          }
        }
      });
    }

    // 为原因输入框也添加类似处理
    const reasonInput = document.getElementById('whitelistReason') as HTMLInputElement;
    if (reasonInput) {
      reasonInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          // 可以聚焦到保存按钮
          const saveButton = document.getElementById('whitelistModalSave') as HTMLButtonElement;
          if (saveButton) {
            saveButton.focus();
          }
        }
      });
    }
  }

  private validateDomainInput(): void {
    const domainInput = document.getElementById('whitelistDomain') as HTMLInputElement;
    if (!domainInput) return;

    const domain = domainInput.value.trim();
    
    if (domain && !this.isValidDomain(domain)) {
      domainInput.classList.add('error');
      domainInput.classList.remove('success');
    } else if (domain) {
      domainInput.classList.remove('error');
      domainInput.classList.add('success');
    } else {
      domainInput.classList.remove('error', 'success');
    }
  }

  private setupTabs(): void {
    const navItems = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-panel');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tabId = item.getAttribute('data-tab');
        
        // 更新导航状态
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // 更新内容显示
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(tabId!)?.classList.add('active');
      });
    });
  }

  private render(): void {
    this.renderGeneralSettings();
    this.renderWhitelist();
    this.renderLogs();
    this.renderStats();
    this.renderSmartSuggestions();
  }

  private renderGeneralSettings(): void {
    if (!this.settings) return;

    const enabledSetting = document.getElementById('enabledSetting') as HTMLInputElement;
    const realtimeMonitoringSetting = document.getElementById('realtimeMonitoringSetting') as HTMLInputElement;
    const loggingSetting = document.getElementById('loggingSetting') as HTMLInputElement;
    const notificationsSetting = document.getElementById('notificationsSetting') as HTMLInputElement;
    const sensitivitySetting = document.getElementById('sensitivitySetting') as HTMLSelectElement;
    const maxLogsSetting = document.getElementById('maxLogsSetting') as HTMLInputElement;
    const dataSanitizationSetting = document.getElementById('dataSanitizationSetting') as HTMLInputElement;

    if (enabledSetting) enabledSetting.checked = this.settings.enabled;
    if (realtimeMonitoringSetting) realtimeMonitoringSetting.checked = this.settings.enabled; // 暂时使用 enabled 设置
    if (loggingSetting) loggingSetting.checked = this.settings.loggingEnabled;
    if (notificationsSetting) notificationsSetting.checked = this.settings.notificationsEnabled;
    if (sensitivitySetting) sensitivitySetting.value = this.settings.sensitivityLevel;
    if (maxLogsSetting) maxLogsSetting.value = this.settings.maxLogEntries.toString();
    if (dataSanitizationSetting) dataSanitizationSetting.checked = (this.settings as any).dataSanitizationEnabled ?? true;
  }

  private renderWhitelist(): void {
    const whitelistTable = document.getElementById('whitelistTable');
    const whitelistTableBody = document.getElementById('whitelistTableBody');
    const whitelistEmptyState = document.getElementById('whitelistEmptyState');
    
    if (!whitelistTable || !whitelistTableBody || !whitelistEmptyState) return;

    // 去重处理 - 基于域名和路径的组合
    const uniqueWhitelist = this.deduplicateWhitelist(this.filteredWhitelist);

    if (uniqueWhitelist.length === 0) {
      whitelistEmptyState.style.display = 'block';
      whitelistTable.style.display = 'none';
      return;
    }

    whitelistEmptyState.style.display = 'none';
    whitelistTable.style.display = 'table';
    
    whitelistTableBody.innerHTML = uniqueWhitelist
      .map(entry => this.createWhitelistRowElement(entry))
      .join('');
      
    // 使用 setTimeout 确保 DOM 完全更新后再绑定事件
    setTimeout(() => {
      this.bindWhitelistEvents();
    }, 0);
      
    // 更新统计
    const totalCount = this.settings?.whitelist ? this.deduplicateWhitelist(this.settings.whitelist).length : 0;
    document.getElementById('whitelistTotalCount')!.textContent = totalCount.toString();
    document.getElementById('whitelistActiveCount')!.textContent = uniqueWhitelist.length.toString();
  }

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

  private bindWhitelistEvents(): void {
    console.log('bindWhitelistEvents called');
    
    // 等待一个微任务周期确保 DOM 完全渲染
    Promise.resolve().then(() => {
      // 首先移除之前的事件监听器（如果存在）
      const existingButtons = document.querySelectorAll('.remove-whitelist-btn');
      console.log('Removing existing buttons:', existingButtons.length);
      
      existingButtons.forEach(btn => {
        // 克隆按钮来移除所有事件监听器
        const newBtn = btn.cloneNode(true) as HTMLButtonElement;
        btn.parentNode?.replaceChild(newBtn, btn);
      });
      
      // 重新绑定删除按钮事件
      const deleteButtons = document.querySelectorAll('.remove-whitelist-btn');
      console.log('Found delete buttons after refresh:', deleteButtons.length);
      
      if (deleteButtons.length === 0) {
        console.warn('No delete buttons found in DOM');
        this.debugDeleteButtons(); // 添加诊断信息
        return;
      }
      
      deleteButtons.forEach((btn, index) => {
        console.log(`Binding event for button ${index}:`, btn);
        
        // 验证按钮数据
        const domain = btn.getAttribute('data-domain');
        const path = btn.getAttribute('data-path');
        console.log(`Button ${index} data:`, { domain, path });
        
        if (!domain) {
          console.error(`Button ${index} missing data-domain attribute`);
          return;
        }
        
        btn.addEventListener('click', (e) => {
          console.log('Delete button clicked!', e.target);
          e.preventDefault();
          e.stopPropagation();
          
          const clickedDomain = btn.getAttribute('data-domain');
          const clickedPath = btn.getAttribute('data-path');
          console.log('Delete button data on click:', { clickedDomain, clickedPath });
          
          if (clickedDomain) {
            this.handleRemoveWhitelist(clickedDomain, clickedPath || undefined);
          } else {
            console.error('No domain found for delete button');
          }
        });
        
        console.log(`Event bound successfully for button ${index}`);
      });
      
      // 同时使用事件委托作为后备方案
      const tableBody = document.getElementById('whitelistTableBody');
      if (tableBody) {
        // 移除之前的委托事件监听器
        tableBody.removeEventListener('click', this.handleTableClick);
        // 添加新的委托事件监听器
        tableBody.addEventListener('click', this.handleTableClick.bind(this));
        console.log('Event delegation setup completed');
      } else {
        console.error('whitelistTableBody not found for event delegation');
      }
      
      // 输出诊断信息
      this.debugDeleteButtons();
    });
  }

  private handleTableClick = (e: Event) => {
    const target = e.target as HTMLElement;
    console.log('Table click detected:', target.tagName, target.className);
    
    // 查找删除按钮，支持多种情况
    let deleteBtn: HTMLElement | null = null;
    
    // 情况1：直接点击按钮
    if (target.classList.contains('remove-whitelist-btn')) {
      deleteBtn = target;
      console.log('Direct button click detected');
    } 
    // 情况2：点击按钮内的图标或文字
    else if (target.closest('.remove-whitelist-btn')) {
      deleteBtn = target.closest('.remove-whitelist-btn') as HTMLElement;
      console.log('Button child element click detected');
    }
    // 情况3：点击按钮的任何子元素
    else if (target.parentElement?.classList.contains('remove-whitelist-btn')) {
      deleteBtn = target.parentElement;
      console.log('Button parent element detected');
    }
    
    if (deleteBtn) {
      console.log('Delete button found via delegation:', deleteBtn);
      e.preventDefault();
      e.stopPropagation();
      
      const domain = deleteBtn.getAttribute('data-domain');
      const path = deleteBtn.getAttribute('data-path');
      console.log('Delete via delegation:', { domain, path });
      
      if (domain) {
        console.log('Calling handleRemoveWhitelist from delegation');
        this.handleRemoveWhitelist(domain, path || undefined);
      } else {
        console.error('No domain found in delegation handler');
      }
    } else {
      console.log('No delete button found in click event');
    }
  }

  private renderLogs(): void {
    const logsList = document.getElementById('logsList');
    const logsTable = document.getElementById('logsTable');
    const logsEmptyState = document.getElementById('logsEmptyState');
    const loggingDisabledWarning = document.getElementById('loggingDisabledWarning');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox') as HTMLInputElement;
    const bulkActionMenu = document.getElementById('bulkActionMenu');
    const bulkSelectedCount = document.getElementById('bulkSelectedCount');
    const selectedCount = document.getElementById('selectedCount');

    if (!logsList || !logsTable || !logsEmptyState) return;

    console.log('renderLogs called - violations count:', this.filteredViolations.length);
    console.log('Settings:', this.settings);

    if (this.filteredViolations.length === 0) {
      logsTable.style.display = 'none';
      logsEmptyState.style.display = 'flex';
      
      // 检查是否是因为日志记录关闭导致的空状态
      if (loggingDisabledWarning && this.settings && !this.settings.loggingEnabled) {
        loggingDisabledWarning.style.display = 'flex';
        console.log('Showing logging disabled warning');
      } else if (loggingDisabledWarning) {
        loggingDisabledWarning.style.display = 'none';
      }
      
      return;
    }

    logsTable.style.display = 'table';
    logsEmptyState.style.display = 'none';
    
    // 更新统计信息
    document.getElementById('totalLogsCount')!.textContent = this.violations.length.toString();
    document.getElementById('filteredLogsCount')!.textContent = this.filteredViolations.length.toString();
    
    // 同时更新统计信息页面的数据
    this.updateStatsPageData();
    
    if (this.violations.length > 0) {
      const lastUpdate = new Date(Math.max(...this.violations.map(v => v.timestamp))).toLocaleString();
      document.getElementById('lastUpdateTime')!.textContent = lastUpdate;
    }
    
    // 渲染表格内容，根据当前视图类型
    switch (this.currentViewType) {
      case 'detailed':
        logsList.innerHTML = this.filteredViolations
          .map(violation => this.createLogItemElement(violation, this.selectedViolationIds.has(violation.id)))
          .join('');
        break;
      case 'compact':
        logsList.innerHTML = this.filteredViolations
          .map(violation => this.createCompactLogItemElement(violation, this.selectedViolationIds.has(violation.id)))
          .join('');
        break;
      case 'grouped':
        logsList.innerHTML = this.createGroupedLogView();
        break;
      default:
        logsList.innerHTML = this.filteredViolations
          .map(violation => this.createLogItemElement(violation, this.selectedViolationIds.has(violation.id)))
          .join('');
    }

    // 多选框事件绑定
    logsList.querySelectorAll('.row-checkbox').forEach((checkbox: Element) => {
      checkbox.addEventListener('change', (e) => {
        const cb = e.target as HTMLInputElement;
        const id = cb.dataset.id;
        if (!id) return;
        if (cb.checked) {
          this.selectedViolationIds.add(id);
        } else {
          this.selectedViolationIds.delete(id);
        }
        this.updateBulkActionUI();
      });
    });

    // 全选框事件
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = this.filteredViolations.length > 0 && this.filteredViolations.every(v => this.selectedViolationIds.has(v.id));
      selectAllCheckbox.onclick = () => {
        if (selectAllCheckbox.checked) {
          this.filteredViolations.forEach(v => this.selectedViolationIds.add(v.id));
        } else {
          this.filteredViolations.forEach(v => this.selectedViolationIds.delete(v.id));
        }
        this.renderLogs();
      };
    }

    // 批量操作菜单显示/隐藏
    if (bulkActionMenu && bulkSelectedCount && selectedCount) {
      const count = this.selectedViolationIds.size;
      bulkSelectedCount.textContent = count.toString();
      selectedCount.textContent = count.toString();
      bulkActionMenu.style.display = count > 0 ? 'block' : 'none';
      
      // 同时更新统计信息页面的选择计数
      this.updateStatsPageData();
    }
      
    // 重新绑定事件监听器
    this.bindLogItemEvents();
      
    // 动态填充来源筛选器
    this.updateSourceFilter();
  }

  private updateSourceFilter(): void {
    const sourceSelect = document.getElementById('sourceFilter') as HTMLSelectElement;
    if (!sourceSelect) return;
    
    // 保存当前选择的值
    const currentValue = sourceSelect.value;
    
    const sources = Array.from(
      new Set(this.violations.map(v => v.scriptOrigin ? this.extractDomain(v.scriptOrigin) : '未知来源'))
    );
    
    sourceSelect.innerHTML = `<option value="">所有来源</option>` +
      sources.map(src => `<option value="${src}">${src}</option>`).join('');
    
    // 恢复之前的选择（如果该选项仍然存在）
    if (currentValue && sources.includes(currentValue)) {
      sourceSelect.value = currentValue;
    }
  }

  private bindLogItemEvents(): void {
    const logsList = document.getElementById('logsList');
    if (!logsList) return;

    // 为所有操作按钮绑定事件
    logsList.querySelectorAll('.action-btn').forEach(button => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        const btn = event.target as HTMLElement;
        const actionBtn = btn.closest('.action-btn') as HTMLButtonElement;
        
        if (!actionBtn) return;

        const violationId = actionBtn.dataset.id;
        const domain = actionBtn.dataset.domain;
        const type = actionBtn.dataset.type;

        if (actionBtn.classList.contains('details-btn') && violationId) {
          this.showViolationDetails(violationId);
        } else if (actionBtn.classList.contains('whitelist-btn') && domain) {
          this.quickAddToWhitelist(domain, '从日志快速添加');
        } else if (actionBtn.classList.contains('ignore-btn') && type) {
          this.ignoreViolationType(type);
        } else if (actionBtn.classList.contains('report-false-btn') && violationId) {
          this.reportFalsePositive(violationId);
        } else if (actionBtn.classList.contains('delete-btn') && violationId) {
          this.handleDeleteSingleViolation(violationId);
        }
      });
    });
  }

  private filterDuplicates(list: PrivacyViolation[]): PrivacyViolation[] {
    const sorted = list.slice().sort((a, b) => a.timestamp - b.timestamp);
    const result: PrivacyViolation[] = [];
    for (const v of sorted) {
      const isDup = result.some(r =>
        r.violationType === v.violationType &&
        (r.targetUrl || r.url) === (v.targetUrl || v.url) &&
        v.timestamp - r.timestamp < this.timeWindowMs
      );
      if (!isDup) {
        result.push(v);
      }
    }
    return result;
  }

  private renderStats(): void {
    if (!this.stats) return;

    // 基础统计
    const totalElement = document.getElementById('totalViolationsCount');
    const todayElement = document.getElementById('todayViolationsCount');
    const whitelistElement = document.getElementById('whitelistSitesCount');
    const blockedElement = document.getElementById('blockedRequestsCount');

    if (totalElement) totalElement.textContent = this.stats.totalViolations.toString();
    if (todayElement) todayElement.textContent = this.stats.todayViolations.toString();
    if (whitelistElement) whitelistElement.textContent = this.stats.whitelistedSites.toString();
    if (blockedElement) blockedElement.textContent = this.stats.blockedRequests.toString();

    // 更新统计信息页面的数据
    this.updateStatsPageData();

    // 扩展统计（基于现有数据计算）
    const realtimeDetectionElement = document.getElementById('realtimeDetectionCount');
    const protectedFormsElement = document.getElementById('protectedFormsCount');
    
    if (realtimeDetectionElement) {
      const realtimeCount = this.violations.filter(v => v.violationType === 'realtime-input').length;
      realtimeDetectionElement.textContent = realtimeCount.toString();
    }
    
    if (protectedFormsElement) {
      const uniqueForms = new Set(this.violations.map(v => v.url)).size;
      protectedFormsElement.textContent = uniqueForms.toString();
    }

    // 威胁类型分析统计
    const thirdPartyReadElement = document.getElementById('thirdPartyReadCount');
    const realtimeTransferElement = document.getElementById('realtimeTransferCount');
    const crossOriginTransferElement = document.getElementById('crossOriginTransferCount');
    const hiddenCollectionElement = document.getElementById('hiddenCollectionCount');

    if (thirdPartyReadElement) {
      const count = this.violations.filter(v => v.violationType === 'third-party-read').length;
      thirdPartyReadElement.textContent = count.toString();
    }

    if (realtimeTransferElement) {
      const count = this.violations.filter(v => v.violationType === 'realtime-input').length;
      realtimeTransferElement.textContent = count.toString();
    }

    if (crossOriginTransferElement) {
      const count = this.violations.filter(v => v.violationType === 'cross-origin').length;
      crossOriginTransferElement.textContent = count.toString();
    }

    if (hiddenCollectionElement) {
      const count = this.violations.filter(v => v.violationType === 'hidden-collection').length;
      hiddenCollectionElement.textContent = count.toString();
    }
  }

  private updateStatsPageData(): void {
    // 更新统计信息页面的数据
    const statsTotalRecords = document.getElementById('statsTotalRecords');
    const statsFilteredRecords = document.getElementById('statsFilteredRecords');
    const statsSelectedCount = document.getElementById('statsSelectedCount');
    const statsFalsePositives = document.getElementById('statsFalsePositives');
    const statsLastUpdated = document.getElementById('statsLastUpdated');

    if (statsTotalRecords) {
      statsTotalRecords.textContent = this.violations.length.toString();
    }

    if (statsFilteredRecords) {
      statsFilteredRecords.textContent = this.filteredViolations.length.toString();
    }

    if (statsSelectedCount) {
      statsSelectedCount.textContent = this.selectedViolationIds.size.toString();
    }

    if (statsFalsePositives) {
      const falsePositiveCount = this.violations.filter(v => 
        this.falsePositiveReports.has(v.id)
      ).length;
      statsFalsePositives.textContent = falsePositiveCount.toString();
    }

    if (statsLastUpdated) {
      if (this.violations.length > 0) {
        const lastUpdate = new Date(Math.max(...this.violations.map(v => v.timestamp))).toLocaleString();
        statsLastUpdated.textContent = lastUpdate;
      } else {
        statsLastUpdated.textContent = '-';
      }
    }
  }

  private renderSmartSuggestions(): void {
    const suggestionsPanel = document.getElementById('whitelistSuggestions');
    const suggestionsList = document.getElementById('suggestionsList');
    
    if (!suggestionsPanel || !suggestionsList) return;

    if (this.smartWhitelistSuggestions.size === 0) {
      suggestionsPanel.style.display = 'none';
      return;
    }

    suggestionsPanel.style.display = 'block';
    suggestionsList.innerHTML = Array.from(this.smartWhitelistSuggestions)
      .map(domain => this.createSuggestionItemElement(domain))
      .join('');

    // 添加事件监听器
    suggestionsList.querySelectorAll('.suggestion-accept').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const domain = Array.from(this.smartWhitelistSuggestions)[index];
        this.acceptSuggestion(domain);
      });
    });

    suggestionsList.querySelectorAll('.suggestion-reject').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const domain = Array.from(this.smartWhitelistSuggestions)[index];
        this.rejectSuggestion(domain);
      });
    });
  }

  private createSuggestionItemElement(domain: string): string {
    const violationCount = this.violations.filter(v => 
      this.extractDomain(v.targetUrl || v.url) === domain
    ).length;
    
    const falsePositiveCount = this.violations.filter(v => 
      this.extractDomain(v.targetUrl || v.url) === domain && 
      this.falsePositiveReports.has(v.id)
    ).length;

    const percentage = Math.round((falsePositiveCount / violationCount) * 100);

    return `
      <div class="suggestion-item">
        <div class="suggestion-info">
          <div class="suggestion-domain">${domain}</div>
          <div class="suggestion-reason">
            ${violationCount} 条记录中有 ${falsePositiveCount} 条被标记为误报 (${percentage}%)
          </div>
        </div>
        <div class="suggestion-actions">
          <button class="btn btn-primary btn-sm suggestion-accept">添加到白名单</button>
          <button class="btn btn-secondary btn-sm suggestion-reject">忽略建议</button>
        </div>
      </div>
    `;
  }

  private async acceptSuggestion(domain: string): Promise<void> {
    const violationCount = this.violations.filter(v => 
      this.extractDomain(v.targetUrl || v.url) === domain
    ).length;
    
    const falsePositiveCount = this.violations.filter(v => 
      this.extractDomain(v.targetUrl || v.url) === domain && 
      this.falsePositiveReports.has(v.id)
    ).length;

    const percentage = Math.round((falsePositiveCount / violationCount) * 100);
    const reason = `智能建议 - 误报率${percentage}% (${falsePositiveCount}/${violationCount})`;

    await this.quickAddToWhitelist(domain, reason);
    this.smartWhitelistSuggestions.delete(domain);
    this.renderSmartSuggestions();
  }

  private rejectSuggestion(domain: string): void {
    this.smartWhitelistSuggestions.delete(domain);
    this.renderSmartSuggestions();
  }

  private createWhitelistRowElement(entry: WhitelistEntry): string {
    const addedDate = new Date(entry.addedAt).toLocaleDateString('zh-CN');
    const addedTime = new Date(entry.addedAt).toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return `
      <tr class="whitelist-row">
        <td class="col-domain">
          <div class="domain-info">
            <span class="domain-name">${entry.domain}</span>
            ${entry.domain.startsWith('*.') ? '<span class="wildcard-badge">通配符</span>' : ''}
          </div>
        </td>
        <td class="col-path">
          ${entry.path ? `<code class="path-code">${entry.path}</code>` : '<span class="no-path">全站</span>'}
        </td>
        <td class="col-reason">
          <span class="reason-text">${entry.reason || '无'}</span>
        </td>
        <td class="col-date">
          <div class="date-info">
            <div class="date-primary">${addedDate}</div>
            <div class="date-secondary">${addedTime}</div>
          </div>
        </td>
        <td class="col-actions">
          <button class="btn btn-danger btn-sm remove-whitelist-btn" 
                  data-domain="${entry.domain}" 
                  data-path="${entry.path || ''}"
                  title="删除此白名单条目">
            <span class="btn-icon">🗑️</span> 删除
          </button>
        </td>
      </tr>
    `;
  }

  private createLogItemElement(violation: PrivacyViolation, checked = false): string {
    const time = new Date(violation.timestamp).toLocaleString();
    const targetDomain = this.extractDomain(violation.targetUrl || violation.url);
    const sourceDomain = violation.scriptOrigin ? this.extractDomain(violation.scriptOrigin) : '未知来源';
    const severityClass = `severity-${violation.severity}`;
    const threatType = this.determineThreatType(violation);
    const violationTypeDisplay = this.getViolationTypeDisplay(violation.violationType);
    const sanitizedValue = violation.details.sanitizedValue || violation.sensitizedValue || '未捕获';
    const isFalsePositive = this.falsePositiveReports.has(violation.id);
    const falsePositiveClass = isFalsePositive ? ' false-positive' : '';
    
    return `
      <tr class="log-item ${severityClass}${falsePositiveClass}" data-id="${violation.id}">
        <td class="col-select">
          <input type="checkbox" class="row-checkbox" data-id="${violation.id}" ${checked ? 'checked' : ''} />
        </td>
        <td class="col-severity">
          <div class="severity-badge ${severityClass}">
            <span class="severity-icon">${this.getSeverityIcon(violation.severity)}</span>
            <span class="severity-text">${this.getSeverityText(violation.severity)}</span>
          </div>
          ${isFalsePositive ? '<span class="false-positive-badge" title="已标记为误报">误报</span>' : ''}
        </td>
        <td class="col-type">
          <span class="field-type-badge">${violation.fieldType}</span>
        </td>
        <td class="col-threat">
          <span class="threat-type-badge">${violationTypeDisplay}</span>
        </td>
        <td class="col-source" title="${violation.scriptOrigin || '未知'}">
          <span class="domain-text">${sourceDomain}</span>
        </td>
        <td class="col-target" title="${violation.targetUrl || violation.url}">
          <span class="domain-text">${targetDomain}</span>
        </td>
        <td class="col-data">
          <code class="data-value">${sanitizedValue}</code>
        </td>
        <td class="col-method">
          <span class="method-badge">${threatType}</span>
        </td>
        <td class="col-time" title="${time}">
          <div class="time-display">
            <span class="time-main">${this.formatTimeForDisplay(violation.timestamp)}</span>
            <span class="time-detail">${this.formatDateForDisplay(violation.timestamp)}</span>
          </div>
        </td>
        <td class="col-actions">
          <div class="action-buttons">
            <button class="action-btn details-btn" title="查看详情" data-id="${violation.id}">
              👁️
            </button>
            <button class="action-btn whitelist-btn" title="添加到白名单" data-domain="${targetDomain}">
              🛡️
            </button>
            <button class="action-btn ignore-btn" title="忽略此类事件" data-type="${violation.violationType}">
              🔇
            </button>
            <button class="action-btn report-false-btn" title="${isFalsePositive ? '取消误报标记' : '报告误报'}" data-id="${violation.id}">
              ${isFalsePositive ? '↩️' : '⚠️'}
            </button>
            <button class="action-btn delete-btn" title="删除此记录" data-id="${violation.id}">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }
  
  private createCompactLogItemElement(violation: PrivacyViolation, isSelected: boolean): string {
    const timeStr = new Date(violation.timestamp).toLocaleTimeString();
    const severityClass = violation.severity;
    const threatType = this.determineThreatType(violation);
    
    return `
      <tr class="log-item compact-item ${this.falsePositiveReports.has(violation.id) ? 'false-positive' : ''}" data-id="${violation.id}">
        <td class="cell-checkbox">
          <input type="checkbox" class="row-checkbox" data-id="${violation.id}" ${isSelected ? 'checked' : ''}>
        </td>
        <td class="cell-time">${timeStr}</td>
        <td class="cell-severity">
          <span class="severity-badge ${severityClass}">${violation.severity}</span>
        </td>
        <td class="cell-site">${this.extractDomain(violation.url)}</td>
        <td class="cell-field">${violation.fieldName}</td>
        <td class="cell-type">${threatType}</td>
        <td class="cell-actions">
          <button class="action-btn details-btn" data-id="${violation.id}" title="查看详情">
            <span class="btn-icon">👁️</span>
          </button>
          <button class="action-btn delete-btn" data-id="${violation.id}" title="删除">
            <span class="btn-icon">🗑️</span>
          </button>
        </td>
      </tr>
    `;
  }

  private createGroupedLogView(): string {
    // 按域名分组
    const groupedByDomain = new Map<string, PrivacyViolation[]>();
    
    this.filteredViolations.forEach(violation => {
      const domain = this.extractDomain(violation.url);
      if (!groupedByDomain.has(domain)) {
        groupedByDomain.set(domain, []);
      }
      groupedByDomain.get(domain)!.push(violation);
    });

    let html = '';
    
    groupedByDomain.forEach((violations, domain) => {
      const severityCount = {
        critical: violations.filter(v => v.severity === 'critical').length,
        high: violations.filter(v => v.severity === 'high').length,
        medium: violations.filter(v => v.severity === 'medium').length,
        low: violations.filter(v => v.severity === 'low').length
      };
      
      html += `
        <tr class="group-header">
          <td colspan="7" class="group-title">
            <div class="group-info">
              <span class="group-domain">${domain}</span>
              <span class="group-count">${violations.length} 条记录</span>
              <div class="group-severity-summary">
                ${severityCount.critical > 0 ? `<span class="severity-badge critical">${severityCount.critical}</span>` : ''}
                ${severityCount.high > 0 ? `<span class="severity-badge high">${severityCount.high}</span>` : ''}
                ${severityCount.medium > 0 ? `<span class="severity-badge medium">${severityCount.medium}</span>` : ''}
                ${severityCount.low > 0 ? `<span class="severity-badge low">${severityCount.low}</span>` : ''}
              </div>
            </div>
          </td>
        </tr>
      `;
      
      // 显示该域名下的违规记录
      violations.forEach(violation => {
        const isSelected = this.selectedViolationIds.has(violation.id);
        html += this.createLogItemElement(violation, isSelected).replace('<tr class="log-item', '<tr class="log-item grouped-item');
      });
    });
    
    return html;
  }

  private getSeverityText(severity: string): string {
    switch(severity) {
      case 'critical': return '严重风险';
      case 'high': return '高风险';
      case 'medium': return '中等风险';
      case 'low': return '低风险';
      default: return '未知风险';
    }
  }
  
  private getSeverityColor(severity: string): string {
    switch(severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  }
  
  private getSeverityIcon(severity: string): string {
    switch(severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  private getViolationTypeDisplay(violationType: string): string {
    switch(violationType) {
      case 'realtime-input': return '实时输入';
      case 'third-party-read': return '第三方读取';
      case 'cross-origin': return '跨域传输';
      case 'hidden-collection': return '隐蔽收集';
      case 'form-hijack': return '表单劫持';
      case 'keylogger': return '键盘记录';
      case 'sensitive-field-access': return '敏感字段访问';
      case 'field-access': return '字段访问';
      default: return violationType || '未知类型';
    }
  }

  private formatTimeForDisplay(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private formatDateForDisplay(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  }

  private async handleSaveSettings(): Promise<void> {
    if (!this.settings) return;

    try {
      const enabledSetting = document.getElementById('enabledSetting') as HTMLInputElement;
      const loggingSetting = document.getElementById('loggingSetting') as HTMLInputElement;
      const notificationsSetting = document.getElementById('notificationsSetting') as HTMLInputElement;
      const sensitivitySetting = document.getElementById('sensitivitySetting') as HTMLSelectElement;
      const maxLogsSetting = document.getElementById('maxLogsSetting') as HTMLInputElement;
      const dataSanitizationSetting = document.getElementById('dataSanitizationSetting') as HTMLInputElement;

      const newSettings: Partial<ExtensionSettings> = {
        enabled: enabledSetting?.checked ?? this.settings.enabled,
        loggingEnabled: loggingSetting?.checked ?? this.settings.loggingEnabled,
        notificationsEnabled: notificationsSetting?.checked ?? this.settings.notificationsEnabled,
        sensitivityLevel: (sensitivitySetting?.value as any) ?? this.settings.sensitivityLevel,
        maxLogEntries: parseInt(maxLogsSetting?.value) || this.settings.maxLogEntries,
        ...(dataSanitizationSetting && { dataSanitizationEnabled: dataSanitizationSetting.checked })
      };

      await this.sendMessage({
        type: 'UPDATE_SETTINGS',
        data: newSettings
      });

      this.settings = { ...this.settings, ...newSettings };
      this.showNotification('设置已保存', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showNotification('设置保存失败', 'error');
    }
  }

  private async handleResetSettings(): Promise<void> {
    if (!confirm('确定要重置所有设置为默认值吗？')) return;

    try {
      const defaultSettings: Partial<ExtensionSettings> = {
        enabled: true,
        loggingEnabled: false,
        notificationsEnabled: true,
        sensitivityLevel: 'medium',
        maxLogEntries: 100,
      };

      await this.sendMessage({
        type: 'UPDATE_SETTINGS',
        data: defaultSettings
      });

      await this.loadData();
      this.renderGeneralSettings();
      this.showNotification('设置已重置', 'success');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      this.showNotification('设置重置失败', 'error');
    }
  }

  private async handleExportSettings(): Promise<void> {
    try {
      if (!this.settings) {
        this.showNotification('没有可导出的设置', 'error');
        return;
      }

      const exportData = {
        settings: this.settings,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `form-privacy-watcher-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      this.showNotification('设置已导出', 'success');
    } catch (error) {
      console.error('Failed to export settings:', error);
      this.showNotification('导出失败', 'error');
    }
  }

  private showAddWhitelistModal(): void {
    const modal = document.getElementById('addWhitelistModal');
    console.log('showAddWhitelistModal called, modal:', modal);
    
    if (modal) {
      // 直接显示模态框，不移动DOM元素
      modal.style.display = 'flex';
      
      console.log('Modal display set to flex');
      
      // 清空表单
      const domainInput = document.getElementById('whitelistDomain') as HTMLInputElement;
      const pathInput = document.getElementById('whitelistPath') as HTMLInputElement;
      const reasonInput = document.getElementById('whitelistReason') as HTMLInputElement;
      
      if (domainInput) {
        domainInput.value = '';
        // 使用 setTimeout 确保模态框完全显示后再聚焦
        setTimeout(() => {
          domainInput.focus();
          console.log('Domain input focused');
        }, 100);
      }
      if (pathInput) pathInput.value = '';
      if (reasonInput) reasonInput.value = '';
      
      // 清除可能的错误状态
      this.clearFormErrors();
    } else {
      console.error('Modal element not found!');
    }
  }

  private clearFormErrors(): void {
    const inputs = document.querySelectorAll('.modal .input');
    inputs.forEach(input => {
      input.classList.remove('error');
    });
  }

  private showInputError(inputId: string, message: string): void {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      input.classList.add('error');
      // 可以考虑添加错误提示文本
    }
    this.showNotification(message, 'error');
  }

  private hideAddWhitelistModal(): void {
    const modal = document.getElementById('addWhitelistModal');
    if (modal) {
      console.log('hideAddWhitelistModal called');
      modal.style.display = 'none';
    }
  }

  private isSubmittingWhitelist = false;

  private async handleSaveWhitelist(): Promise<void> {
    // 防止重复提交
    if (this.isSubmittingWhitelist) {
      console.log('Already submitting whitelist, ignoring duplicate call');
      return;
    }

    this.isSubmittingWhitelist = true;

    try {
      const domainInput = document.getElementById('whitelistDomain') as HTMLInputElement;
      const pathInput = document.getElementById('whitelistPath') as HTMLInputElement;
      const reasonInput = document.getElementById('whitelistReason') as HTMLInputElement;

      const domain = domainInput?.value.trim();
      const path = pathInput?.value.trim();
      const reason = reasonInput?.value.trim();

      // 清除之前的错误状态
      this.clearFormErrors();

      // 验证域名
      if (!domain) {
        this.showInputError('whitelistDomain', '请输入域名');
        this.isSubmittingWhitelist = false;
        return;
      }

      // 验证域名格式
      if (!this.isValidDomain(domain)) {
        this.showInputError('whitelistDomain', '域名格式不正确');
        this.isSubmittingWhitelist = false;
        return;
      }

      // 检查是否已经存在
      if (this.settings?.whitelist.some(entry => entry.domain === domain && entry.path === path)) {
        this.showInputError('whitelistDomain', '该域名和路径组合已存在于白名单中');
        this.isSubmittingWhitelist = false;
        return;
      }

      const entry: WhitelistEntry = {
        domain,
        path: path || undefined,
        addedAt: Date.now(),
        reason: reason || '用户手动添加'
      };

      await this.sendMessage({
        type: 'ADD_WHITELIST',
        data: entry
      });

      await this.loadData();
      this.renderWhitelist();
      this.renderStats();
      this.hideAddWhitelistModal();
      
      // 显示详细的成功信息
      const successMessage = path 
        ? `已将 ${domain}${path} 添加到白名单` 
        : `已将 ${domain} 添加到白名单`;
      this.showNotification(successMessage, 'success');
    } catch (error) {
      console.error('Failed to add whitelist entry:', error);
      this.showNotification('添加白名单失败，请重试', 'error');
    } finally {
      // 重置提交状态
      this.isSubmittingWhitelist = false;
    }
  }

  private async quickAddToWhitelist(domain: string, reason: string): Promise<void> {
    try {
      const entry: WhitelistEntry = {
        domain,
        addedAt: Date.now(),
        reason
      };

      await this.sendMessage({
        type: 'ADD_WHITELIST',
        data: entry
      });

      await this.loadData();
      this.renderWhitelist();
      this.renderStats();
      
      this.showNotification(`已将 ${domain} 添加到白名单`, 'success');
    } catch (error) {
      console.error('添加到白名单失败:', error);
      this.showNotification('添加失败，请重试', 'error');
    }
  }

  private ignoreViolationType(type: string): void {
    // 这里可以实现忽略特定违规类型的逻辑
    this.showNotification(`已忽略 ${type} 类型的违规`, 'info');
  }

  private reportFalsePositive(violationId: string): void {
    this.falsePositiveReports.add(violationId);
    this.showNotification('已标记为误报', 'success');
    this.renderLogs();
  }

  private showViolationDetails(violationId: string): void {
    const violation = this.violations.find(v => v.id === violationId);
    if (!violation) {
      this.showNotification('找不到该记录', 'error');
      return;
    }
    
    // 创建模态框
    const modal = this.createViolationDetailsModal(violation);
    document.body.appendChild(modal);
    
    // 绑定关闭事件
    const closeBtn = modal.querySelector('.violation-details-close');
    const closeModal = () => {
      modal.remove();
    };
    
    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    
    // ESC键关闭
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  private createViolationDetailsModal(violation: PrivacyViolation): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'violation-details-modal';
    
    const timeStr = new Date(violation.timestamp).toLocaleString();
    const sourceDomain = violation.scriptOrigin ? this.extractDomain(violation.scriptOrigin) : '直接访问';
    const threatType = this.determineThreatType(violation);
    
    modal.innerHTML = `
      <div class="violation-details-content">
        <div class="violation-details-header">
          <h3 class="violation-details-title">隐私违规详情</h3>
          <button class="violation-details-close">&times;</button>
        </div>
        <div class="violation-details-body">
          <div class="detail-row">
            <div class="detail-item">
              <span class="detail-label">时间</span>
              <div class="detail-value">${timeStr}</div>
            </div>
            <div class="detail-item">
              <span class="detail-label">严重程度</span>
              <div class="detail-value">
                <span class="severity-indicator">
                  <span class="severity-dot ${violation.severity}"></span>
                  ${violation.severity.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-item">
              <span class="detail-label">网站域名</span>
              <div class="detail-value">${violation.domain}</div>
            </div>
            <div class="detail-item">
              <span class="detail-label">来源</span>
              <div class="detail-value">${sourceDomain}</div>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-item">
              <span class="detail-label">字段名称</span>
              <div class="detail-value">${violation.fieldName}</div>
            </div>
            <div class="detail-item">
              <span class="detail-label">威胁类型</span>
              <div class="detail-value">${threatType}</div>
            </div>
          </div>
          
          <div class="detail-section">
            <span class="detail-label">完整URL</span>
            <div class="detail-value">${violation.url || violation.targetUrl || '未知'}</div>
          </div>
          
          <div class="detail-section">
            <span class="detail-label">违规描述</span>
            <div class="detail-value">${violation.description}</div>
          </div>
          
          ${violation.details?.sanitizedValue ? `
          <div class="detail-section">
            <span class="detail-label">敏感数据值</span>
            <div class="detail-value">${violation.details.sanitizedValue}</div>
          </div>
          ` : ''}
          
          ${violation.stackTrace ? `
          <div class="detail-section">
            <span class="detail-label">调用堆栈</span>
            <div class="detail-value code">${violation.stackTrace}</div>
          </div>
          ` : ''}
          
          <div class="detail-section">
            <span class="detail-label">记录ID</span>
            <div class="detail-value">${violation.id}</div>
          </div>
        </div>
      </div>
    `;
    
    return modal;
  }

  private debugDeleteButtons(): void {
    console.log('Debug: Checking delete buttons');
    const deleteButtons = document.querySelectorAll('.delete-btn');
    console.log(`Found ${deleteButtons.length} delete buttons`);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // 简单的通知实现
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // 如果有通知容器，可以显示在页面上
    const notificationContainer = document.getElementById('notificationContainer');
    if (notificationContainer) {
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.textContent = message;
      notificationContainer.appendChild(notification);
      
      // 3秒后自动移除
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
  }

  private async sendMessage(message: Message): Promise<MessageResponse> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response || { success: false, error: 'No response' });
      });
    });
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  private isValidDomain(domain: string): boolean {
    const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return domainPattern.test(domain);
  }

  private determineThreatType(violation: PrivacyViolation): string {
    // 简单的威胁类型判断逻辑
    if (violation.violationType.includes('password')) return '密码字段';
    if (violation.violationType.includes('email')) return '邮箱字段';
    if (violation.violationType.includes('phone')) return '电话字段';
    if (violation.violationType.includes('access')) return '字段访问';
    return '其他';
  }

  private setupPeriodicRefresh(): void {
    // 每30秒检查一次新数据
    setInterval(async () => {
      try {
        const violationsResponse = await this.sendMessage({ type: 'GET_VIOLATIONS' });
        const newViolations = violationsResponse.data || [];
        
        // 增量更新：只添加新的违规记录
        const existingIds = new Set(this.violations.map(v => v.id));
        const newViolationsOnly = newViolations.filter((v: PrivacyViolation) => !existingIds.has(v.id));
        
        if (newViolationsOnly.length > 0) {
          this.violations = [...this.violations, ...newViolationsOnly];
          
          if (this.deduplicationEnabled) {
            this.violations = this.filterDuplicates(this.violations);
          }
          
          this.applyCurrentFilters();
          this.applySorting();
          this.renderLogs();
          this.updateStatsPageData();
          this.updateSourceFilter();
        }
      } catch (error) {
        console.error('定期刷新失败:', error);
      }
    }, 30000);
  }

  private handleWhitelistSearch(): void {
    // 实现白名单搜索功能
    const searchInput = document.getElementById('whitelistSearch') as HTMLInputElement;
    const searchTerm = searchInput?.value.toLowerCase() || '';
    
    this.filteredWhitelist = this.settings?.whitelist.filter(entry => 
      entry.domain.toLowerCase().includes(searchTerm) ||
      (entry.path || '').toLowerCase().includes(searchTerm) ||
      (entry.reason || '').toLowerCase().includes(searchTerm)
    ) || [];
    
    this.renderWhitelist();
  }

  private handleExportLogs(): void {
    // 导出日志功能
    const data = JSON.stringify(this.filteredViolations, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `privacy-violations-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showNotification('日志已导出', 'success');
  }

  private handleLogsSearch(): void {
    this.applyCurrentFilters();
    this.renderLogs();
  }

  private handleSeverityFilter(): void {
    this.applyCurrentFilters();
    this.renderLogs();
  }

  private handleLogsFilter(): void {
    this.applyCurrentFilters();
    this.renderLogs();
  }

  private handleLogsSort(): void {
    const sortBy = (document.getElementById('sortBy') as HTMLSelectElement)?.value;
    if (sortBy) {
      this.currentSortBy = sortBy;
      this.applySorting();
      this.renderLogs();
    }
  }

  private handleTimeWindowChange(): void {
    const timeWindow = (document.getElementById('timeWindow') as HTMLInputElement)?.value;
    this.timeWindowMs = parseInt(timeWindow) * 1000 || 5000;
    
    // 重新应用去重
    if (this.deduplicationEnabled) {
      this.violations = this.filterDuplicates(this.violations);
      this.applyCurrentFilters();
      this.renderLogs();
    }
  }

  private async handleRemoveWhitelist(domain: string, path?: string): Promise<void> {
    try {
      await this.sendMessage({
        type: 'REMOVE_WHITELIST',
        data: { domain, path }
      });
      
      await this.loadData();
      this.renderWhitelist();
      this.renderStats();
      
      const message = path ? `已从白名单移除 ${domain}${path}` : `已从白名单移除 ${domain}`;
      this.showNotification(message, 'success');
    } catch (error) {
      console.error('移除白名单失败:', error);
      this.showNotification('移除失败，请重试', 'error');
    }
  }

  private async handleRefreshLogs(): Promise<void> {
    const refreshBtn = document.getElementById('refreshLogs') as HTMLButtonElement;
    
    try {
      if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '刷新中...';
      }
      
      const violationsResponse = await this.sendMessage({ type: 'GET_VIOLATIONS' });
      const newViolations = violationsResponse.data || [];
      
      const existingIds = new Set(this.violations.map(v => v.id));
      const newViolationsOnly = newViolations.filter((v: PrivacyViolation) => !existingIds.has(v.id));
      
      if (newViolationsOnly.length > 0) {
        this.violations = [...this.violations, ...newViolationsOnly];
        
        if (this.deduplicationEnabled) {
          this.violations = this.filterDuplicates(this.violations);
        }
        
        this.applyCurrentFilters();
        this.applySorting();
        this.renderLogs();
        this.updateStatsPageData();
        this.updateSourceFilter();
        
        this.showNotification(`发现 ${newViolationsOnly.length} 条新记录`, 'success');
      } else {
        this.showNotification('没有新的记录', 'info');
      }
    } catch (error) {
      console.error('刷新日志失败:', error);
      this.showNotification('刷新失败，请重试', 'error');
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '刷新';
      }
    }
  }

  private async handleClearLogs(): Promise<void> {
    try {
      await this.sendMessage({ type: 'CLEAR_LOGS' });
      
      this.violations = [];
      this.filteredViolations = [];
      this.selectedViolationIds.clear();
      
      this.renderLogs();
      this.updateStatsPageData();
      this.updateBulkActionUI();
      
      const selectAllCheckbox = document.getElementById('selectAllCheckbox') as HTMLInputElement;
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
      }
      
      this.showNotification('所有日志已清空', 'success');
    } catch (error) {
      console.error('清空日志失败:', error);
      this.showNotification('清空失败，请重试', 'error');
    }
  }

  private async handleResetAllFilters(): Promise<void> {
    try {
      (document.getElementById('severityFilter') as HTMLSelectElement).value = '';
      (document.getElementById('typeFilter') as HTMLSelectElement).value = '';
      (document.getElementById('sourceFilter') as HTMLSelectElement).value = '';
      (document.getElementById('timeFilter') as HTMLSelectElement).value = '';
      (document.getElementById('sortBy') as HTMLSelectElement).value = 'time-desc';
      (document.getElementById('logsSearch') as HTMLInputElement).value = '';
      (document.getElementById('deduplicationEnabled') as HTMLInputElement).checked = true;
      (document.getElementById('hideFalsePositives') as HTMLInputElement).checked = false;
      
      const advancedPanel = document.getElementById('advancedSearchPanel');
      if (advancedPanel && advancedPanel.style.display !== 'none') {
        this.resetAdvancedSearch();
      }
      
      this.currentSortBy = 'time-desc';
      this.deduplicationEnabled = true;
      this.selectedViolationIds.clear();
      
      this.violations = this.deduplicationEnabled ? this.filterDuplicates(this.violations) : this.violations;
      this.filteredViolations = [...this.violations];
      this.applySorting();
      this.renderLogs();
      this.updateBulkActionUI();
      this.updateSourceFilter();
      
      this.showNotification('所有筛选器已重置', 'success');
    } catch (error) {
      console.error('重置筛选器失败:', error);
      this.showNotification('重置失败，请重试', 'error');
    }
  }

  private async handleDeleteSingleViolation(violationId: string): Promise<void> {
    try {
      this.violations = this.violations.filter(v => v.id !== violationId);
      this.filteredViolations = this.filteredViolations.filter(v => v.id !== violationId);
      this.selectedViolationIds.delete(violationId);
      
      await this.syncViolationsToBackground();
      
      this.renderLogs();
      this.updateStatsPageData();
      this.updateBulkActionUI();
      
      this.showNotification('已删除该记录', 'success');
    } catch (error) {
      console.error('删除记录失败:', error);
      this.showNotification('删除失败，请重试', 'error');
    }
  }

  private handleRuntimeMessage(message: any, _sender: any, _sendResponse: any): void {
    if (message.type === 'PRIVACY_VIOLATION_DETECTED') {
      this.violations.push(message.data);
      if (this.deduplicationEnabled) {
        this.violations = this.filterDuplicates(this.violations);
      }
      this.applyCurrentFilters();
      this.renderLogs();
      this.updateStatsPageData();
    }
  }

  private changeLogsView(viewType: 'detailed' | 'compact' | 'grouped'): void {
    this.currentViewType = viewType;
    
    // 更新按钮状态
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`view${viewType.charAt(0).toUpperCase() + viewType.slice(1)}`)?.classList.add('active');
    
    // 重新渲染
    this.renderLogs();
    
    this.showNotification(`已切换到${viewType === 'detailed' ? '详细' : viewType === 'compact' ? '紧凑' : '分组'}视图`, 'info');
  }

  private handleSelectAll(): void {
    const checkbox = document.getElementById('selectAllCheckbox') as HTMLInputElement;
    const isChecked = checkbox?.checked;
    
    if (isChecked) {
      this.filteredViolations.forEach(v => this.selectedViolationIds.add(v.id));
    } else {
      this.selectedViolationIds.clear();
    }
    
    this.updateBulkActionUI();
    this.renderLogs();
  }

  private async handleBulkDelete(): Promise<void> {
    try {
      if (this.selectedViolationIds.size === 0) {
        this.showNotification('请先选择要删除的记录', 'info');
        return;
      }
      
      const idsToDelete = Array.from(this.selectedViolationIds);
      
      this.violations = this.violations.filter(v => !idsToDelete.includes(v.id));
      this.filteredViolations = this.filteredViolations.filter(v => !idsToDelete.includes(v.id));
      this.selectedViolationIds.clear();
      
      await this.syncViolationsToBackground();
      
      this.renderLogs();
      this.updateStatsPageData();
      this.updateBulkActionUI();
      
      this.showNotification(`已删除 ${idsToDelete.length} 条记录`, 'success');
    } catch (error) {
      console.error('批量删除失败:', error);
      this.showNotification('删除失败，请重试', 'error');
    }
  }

  private handleBulkMarkFalsePositive(): void {
    if (this.selectedViolationIds.size === 0) {
      this.showNotification('请先选择要标记的记录', 'info');
      return;
    }
    
    this.selectedViolationIds.forEach(id => {
      this.falsePositiveReports.add(id);
    });
    
    this.selectedViolationIds.clear();
    this.updateBulkActionUI();
    this.renderLogs();
    
    this.showNotification('已标记为误报', 'success');
  }

  private handleBulkAddToWhitelist(): void {
    if (this.selectedViolationIds.size === 0) {
      this.showNotification('请先选择要添加到白名单的记录', 'info');
      return;
    }
    
    const domains = new Set<string>();
    this.filteredViolations
      .filter(v => this.selectedViolationIds.has(v.id))
      .forEach(v => domains.add(this.extractDomain(v.url)));
    
    domains.forEach(domain => {
      this.quickAddToWhitelist(domain, '批量操作添加');
    });
    
    this.selectedViolationIds.clear();
    this.updateBulkActionUI();
    this.renderLogs();
  }

  private handleBulkIgnoreType(): void {
    if (this.selectedViolationIds.size === 0) {
      this.showNotification('请先选择要忽略类型的记录', 'info');
      return;
    }
    
    const types = new Set<string>();
    this.filteredViolations
      .filter(v => this.selectedViolationIds.has(v.id))
      .forEach(v => types.add(v.violationType));
    
    types.forEach(type => {
      this.ignoreViolationType(type);
    });
    
    this.selectedViolationIds.clear();
    this.updateBulkActionUI();
    this.renderLogs();
  }

  private handleCancelBulkSelection(): void {
    this.selectedViolationIds.clear();
    this.updateBulkActionUI();
    this.renderLogs();
    
    const selectAllCheckbox = document.getElementById('selectAllCheckbox') as HTMLInputElement;
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
    }
  }

  private handleDeduplicationToggle(): void {
    const checkbox = document.getElementById('deduplicationEnabled') as HTMLInputElement;
    this.deduplicationEnabled = checkbox?.checked ?? true;
    
    if (this.deduplicationEnabled) {
      this.violations = this.filterDuplicates(this.violations);
    } else {
      this.loadData().then(() => {
        this.applyCurrentFilters();
        this.renderLogs();
      });
      return;
    }
    
    this.applyCurrentFilters();
    this.renderLogs();
  }

  private toggleAdvancedSearch(): void {
    const searchContainer = document.querySelector('.search-group') as HTMLElement;
    if (!searchContainer) return;
    
    let panel = document.getElementById('advancedSearchPanel');
    if (!panel) {
      panel = this.createAdvancedSearchPanel();
      searchContainer.appendChild(panel);
    }
    
    if (panel.style.display === 'none' || !panel.style.display) {
      panel.style.display = 'block';
      panel.style.animation = 'slideDown 0.3s ease-out';
    } else {
      panel.style.animation = 'slideUp 0.3s ease-out';
      setTimeout(() => {
        panel!.style.display = 'none';
      }, 300);
    }
  }

  private createAdvancedSearchPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'advancedSearchPanel';
    panel.className = 'advanced-search-panel';
    panel.innerHTML = `
      <h4>高级搜索</h4>
      <div class="advanced-search-form">
        <div class="form-row">
          <label>字段名称:</label>
          <input type="text" id="advancedFieldName" placeholder="输入字段名称">
        </div>
        <div class="form-row">
          <label>域名:</label>
          <input type="text" id="advancedDomain" placeholder="输入域名">
        </div>
        <div class="form-row">
          <label>时间范围:</label>
          <select id="advancedTimeRange">
            <option value="">所有时间</option>
            <option value="1h">最近1小时</option>
            <option value="6h">最近6小时</option>
            <option value="24h">最近24小时</option>
            <option value="7d">最近7天</option>
          </select>
        </div>
        <div class="form-row">
          <label>数据内容:</label>
          <input type="text" id="advancedDataContent" placeholder="搜索数据内容">
        </div>
        <div class="form-actions">
          <button type="button" id="applyAdvancedSearch" class="btn btn-primary">应用搜索</button>
          <button type="button" id="resetAdvancedSearch" class="btn btn-secondary">重置</button>
        </div>
      </div>
    `;
    return panel;
  }

  private handleAdvancedSearch(): void {
    const fieldName = (document.getElementById('advancedFieldName') as HTMLInputElement)?.value.toLowerCase() || '';
    const domain = (document.getElementById('advancedDomain') as HTMLInputElement)?.value.toLowerCase() || '';
    const timeRange = (document.getElementById('advancedTimeRange') as HTMLSelectElement)?.value || '';
    const dataContent = (document.getElementById('advancedDataContent') as HTMLInputElement)?.value.toLowerCase() || '';
    
    this.filteredViolations = this.violations.filter(violation => {
      let matches = true;
      
      if (fieldName && !violation.fieldName.toLowerCase().includes(fieldName)) {
        matches = false;
      }
      
      if (domain && !violation.domain.toLowerCase().includes(domain)) {
        matches = false;
      }
      
      if (timeRange) {
        const now = Date.now();
        let timeLimit = 0;
        switch (timeRange) {
          case '1h':
            timeLimit = now - 60 * 60 * 1000;
            break;
          case '6h':
            timeLimit = now - 6 * 60 * 60 * 1000;
            break;
          case '24h':
            timeLimit = now - 24 * 60 * 60 * 1000;
            break;
          case '7d':
            timeLimit = now - 7 * 24 * 60 * 60 * 1000;
            break;
        }
        if (timeLimit > 0 && violation.timestamp < timeLimit) {
          matches = false;
        }
      }
      
      if (dataContent) {
        const sanitizedValue = violation.details.sanitizedValue || violation.sensitizedValue || '';
        if (!sanitizedValue.toLowerCase().includes(dataContent)) {
          matches = false;
        }
      }
      
      return matches;
    });
    
    this.applySorting();
    this.renderLogs();
    
    this.showNotification(`高级搜索找到 ${this.filteredViolations.length} 条记录`, 'info');
    
    const panel = document.getElementById('advancedSearchPanel');
    if (panel) {
      panel.style.animation = 'slideUp 0.3s ease-out';
      setTimeout(() => {
        panel.style.display = 'none';
      }, 300);
    }
  }

  private resetAdvancedSearch(): void {
    (document.getElementById('advancedFieldName') as HTMLInputElement).value = '';
    (document.getElementById('advancedDomain') as HTMLInputElement).value = '';
    (document.getElementById('advancedTimeRange') as HTMLSelectElement).value = '';
    (document.getElementById('advancedDataContent') as HTMLInputElement).value = '';
    
    this.applyCurrentFilters();
    this.renderLogs();
    
    this.showNotification('已重置高级搜索', 'info');
  }

  private applyCurrentFilters(): void {
    const searchTerm = (document.getElementById('logsSearch') as HTMLInputElement)?.value.toLowerCase() || '';
    const severityFilter = (document.getElementById('severityFilter') as HTMLSelectElement)?.value || '';
    const typeFilter = (document.getElementById('typeFilter') as HTMLSelectElement)?.value || '';
    const sourceFilter = (document.getElementById('sourceFilter') as HTMLSelectElement)?.value || '';
    const timeFilter = (document.getElementById('timeFilter') as HTMLSelectElement)?.value || '';
    const hideFalsePositives = (document.getElementById('hideFalsePositives') as HTMLInputElement)?.checked || false;

    this.filteredViolations = this.violations.filter((violation: PrivacyViolation) => {
      // 搜索过滤
      if (searchTerm && !violation.description.toLowerCase().includes(searchTerm) && 
          !violation.fieldName.toLowerCase().includes(searchTerm) && 
          !violation.domain.toLowerCase().includes(searchTerm)) {
        return false;
      }

      // 严重程度过滤
      if (severityFilter && violation.severity !== severityFilter) {
        return false;
      }

      // 威胁类型过滤
      if (typeFilter && violation.violationType !== typeFilter) {
        return false;
      }

      // 来源过滤
      if (sourceFilter) {
        const sourceDomain = violation.scriptOrigin ? this.extractDomain(violation.scriptOrigin) : '';
        if (sourceDomain !== sourceFilter) {
          return false;
        }
      }

      // 时间过滤
      if (timeFilter) {
        const now = Date.now();
        const violationTime = violation.timestamp;
        
        switch (timeFilter) {
          case 'today':
            const todayStart = new Date().setHours(0, 0, 0, 0);
            if (violationTime < todayStart) return false;
            break;
          case 'yesterday':
            const yesterdayStart = new Date(Date.now() - 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0);
            const yesterdayEnd = new Date().setHours(0, 0, 0, 0);
            if (violationTime < yesterdayStart || violationTime >= yesterdayEnd) return false;
            break;
          case 'week':
            const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
            if (violationTime < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
            if (violationTime < monthAgo) return false;
            break;
        }
      }

      // 隐藏误报
      if (hideFalsePositives && this.falsePositiveReports.has(violation.id)) {
        return false;
      }

      return true;
    });
  }

  private applySorting(): void {
    this.filteredViolations.sort((a, b) => {

      switch (this.currentSortBy) {
        case 'time-desc':
          return b.timestamp - a.timestamp;
        case 'time-asc':
          return a.timestamp - b.timestamp;
        case 'severity-desc':
          return this.getSeverityLevel(b.severity) - this.getSeverityLevel(a.severity);
        case 'severity-asc':
          return this.getSeverityLevel(a.severity) - this.getSeverityLevel(b.severity);
        case 'domain':
          return this.extractDomain(a.url).localeCompare(this.extractDomain(b.url));
        case 'source':
          const sourceA = a.scriptOrigin ? this.extractDomain(a.scriptOrigin) : '';
          const sourceB = b.scriptOrigin ? this.extractDomain(b.scriptOrigin) : '';
          return sourceA.localeCompare(sourceB);
        case 'type':
          return a.violationType.localeCompare(b.violationType);
        default:
          return b.timestamp - a.timestamp;
      }
    });
  }

  private getSeverityLevel(severity: string): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  private updateBulkActionUI(): void {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox') as HTMLInputElement;
    const bulkActionMenu = document.getElementById('bulkActionMenu');
    const selectedCount = this.selectedViolationIds.size;
    
    if (selectAllCheckbox) {
      const totalVisible = this.filteredViolations.length;
      selectAllCheckbox.checked = selectedCount > 0 && selectedCount === totalVisible;
      selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalVisible;
    }
    
    if (bulkActionMenu) {
      bulkActionMenu.style.display = selectedCount > 0 ? 'block' : 'none';
      
      const countElement = bulkActionMenu.querySelector('.selection-count');
      if (countElement) {
        countElement.textContent = `已选择 ${selectedCount} 项`;
      }
    }
  }

  private async syncViolationsToBackground(): Promise<void> {
    try {
      await this.sendMessage({
        type: 'UPDATE_VIOLATIONS',
        data: this.violations
      });
    } catch (error) {
      console.error('同步数据到后端失败:', error);
      throw error;
    }
  }
}

// 创建实例
new OptionsController();