import { FormField, AccessEvent, Message } from '@/types';
import { DataSanitizer } from '@/utils/dataSanitizer';

class FormMonitor {
  private formFields: Map<string, FormField> = new Map();
  private accessEvents: AccessEvent[] = [];
  private observer: MutationObserver | null = null;
  private isInjected = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  private start(): void {
    this.injectFormMonitoring();
    this.setupMutationObserver();
    this.listenForMessages();
  }

  private injectFormMonitoring(): void {
    if (this.isInjected) return;

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
    
    this.isInjected = true;
  }

  private setupMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.scanForFormFields(node as Element);
            }
          });
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 扫描现有表单字段
    this.scanForFormFields(document.body);
  }

  private scanForFormFields(element: Element): void {
    const formElements = element.querySelectorAll('input, textarea, select');
    
    formElements.forEach((el) => {
      const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      
      // 跳过按钮和隐藏字段
      if (input.type === 'button' || input.type === 'submit' || input.type === 'hidden') {
        return;
      }

      const fieldId = this.generateFieldId(input);
      const field: FormField = {
        id: fieldId,
        name: input.name || input.id || fieldId,
        type: input.type || 'text',
        value: '',
        element: input,
        lastModified: Date.now()
      };

      this.formFields.set(fieldId, field);
      this.attachEventListeners(input, field);
    });
  }

  private generateFieldId(element: Element): string {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private attachEventListeners(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, field: FormField): void {
    const events = ['input', 'change', 'keyup', 'blur'];
    
    events.forEach(eventType => {
      element.addEventListener(eventType, this.debounce((event: Event) => {
        const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        field.value = target.value;
        field.lastModified = Date.now();
        
        // 监控所有有值的输入，不仅仅是长度>=3的
        if (target.value.length > 0) {
          this.setupValueAccessTrap(field);
          
          // 立即触发一次检测，模拟字段被访问
          const accessEvent: AccessEvent = {
            fieldId: field.id,
            fieldName: field.name,
            accessTime: Date.now(),
            stackTrace: new Error().stack || '',
            scriptOrigin: window.location.origin,
            accessType: 'property'
          };

          this.sendMessage({
            type: 'FIELD_ACCESSED',
            data: {
              field,
              accessEvent
            }
          });
        }
      }, 300));
    });
  }

  private setupValueAccessTrap(field: FormField): void {
    const element = field.element;
    const originalDescriptor = Object.getOwnPropertyDescriptor(element, 'value') || 
                             Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');

    if (!originalDescriptor) return;

    Object.defineProperty(element, 'value', {
      get: () => {
        // 记录访问事件
        const accessEvent: AccessEvent = {
          fieldId: field.id,
          fieldName: field.name,
          accessTime: Date.now(),
          stackTrace: new Error().stack || '',
          scriptOrigin: this.getScriptOrigin(),
          accessType: 'property'
        };

        this.accessEvents.push(accessEvent);
        
        // 通知背景脚本
        this.sendMessage({
          type: 'FIELD_ACCESSED',
          data: {
            field,
            accessEvent
          }
        });

        return originalDescriptor.get?.call(element);
      },
      set: originalDescriptor.set,
      configurable: true
    });
  }

  private getScriptOrigin(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';

    const lines = stack.split('\n');
    for (const line of lines) {
      if (line.includes('http')) {
        const match = line.match(/https?:\/\/[^\/\s]+/);
        if (match) {
          return match[0];
        }
      }
    }
    return window.location.origin;
  }

  private debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
    let timeoutId: ReturnType<typeof setTimeout>;
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
  }

  private sendMessage(message: Message): void {
    chrome.runtime.sendMessage(message).catch(error => {
      console.debug('Form Privacy Watcher: Failed to send message', error);
    });
  }

  private listenForMessages(): void {
    // 监听来自注入脚本的消息
    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data.type) return;
      
      if (event.data.type === 'FORM_FIELD_ACCESS') {
        this.handleFieldAccess(event.data);
      }
    });
  }

  private handleFieldAccess(data: any): void {
    const { fieldSelector, accessType, stackTrace } = data;
    
    // 找到对应的表单字段
    const element = document.querySelector(fieldSelector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (!element) return;

    const field = Array.from(this.formFields.values()).find(f => f.element === element);
    if (!field) return;

    const accessEvent: AccessEvent = {
      fieldId: field.id,
      fieldName: field.name,
      accessTime: Date.now(),
      stackTrace,
      scriptOrigin: this.getScriptOrigin(),
      accessType
    };

    this.sendMessage({
      type: 'FIELD_ACCESSED',
      data: {
        field,
        accessEvent
      }
    });
  }

  public cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.formFields.clear();
    this.accessEvents = [];
  }
}

// 启动监控
const monitor = new FormMonitor();

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  monitor.cleanup();
});
