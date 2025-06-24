// 注入到页面的脚本，用于监控表单字段访问
(function() {
  'use strict';

  // 避免重复注入
  if ((window as any).formPrivacyWatcherInjected) return;
  (window as any).formPrivacyWatcherInjected = true;

  const originalInputDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const originalTextAreaDescriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
  const originalSelectDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');

  // 监控 HTMLInputElement.value 访问
  if (originalInputDescriptor) {
    Object.defineProperty(HTMLInputElement.prototype, 'value', {
      get: function() {
        const result = originalInputDescriptor.get?.call(this);
        
        if (this.type !== 'hidden' && this.type !== 'submit' && result && result.length > 2) {
          notifyFieldAccess(this, 'property', 'HTMLInputElement.value');
        }
        
        return result;
      },
      set: originalInputDescriptor.set,
      configurable: true
    });
  }

  // 监控 HTMLTextAreaElement.value 访问
  if (originalTextAreaDescriptor) {
    Object.defineProperty(HTMLTextAreaElement.prototype, 'value', {
      get: function() {
        const result = originalTextAreaDescriptor.get?.call(this);
        
        if (result && result.length > 2) {
          notifyFieldAccess(this, 'property', 'HTMLTextAreaElement.value');
        }
        
        return result;
      },
      set: originalTextAreaDescriptor.set,
      configurable: true
    });
  }

  // 监控 HTMLSelectElement.value 访问
  if (originalSelectDescriptor) {
    Object.defineProperty(HTMLSelectElement.prototype, 'value', {
      get: function() {
        const result = originalSelectDescriptor.get?.call(this);
        
        if (result && result.length > 0) {
          notifyFieldAccess(this, 'property', 'HTMLSelectElement.value');
        }
        
        return result;
      },
      set: originalSelectDescriptor.set,
      configurable: true
    });
  }

  // 监控 getAttribute 调用
  const originalGetAttribute = Element.prototype.getAttribute;
  Element.prototype.getAttribute = function(name: string) {
    const result = originalGetAttribute.call(this, name);
    
    if (name === 'value' && this.tagName && 
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(this.tagName) &&
        result && result.length > 2) {
      notifyFieldAccess(this, 'attribute', 'Element.getAttribute');
    }
    
    return result;
  };

  // 监控表单序列化
  const originalFormData = window.FormData;
  window.FormData = function(form?: HTMLFormElement) {
    if (form) {
      notifyFormSerialization(form, 'FormData');
    }
    return new originalFormData(form);
  } as any;

  // 监控 jQuery 访问（如果存在）
  const checkJQuery = () => {
    const win = window as any;
    if (win.jQuery || win.$) {
      const $ = win.jQuery || win.$;
      const originalVal = $.fn.val;
      
      $.fn.val = function(value?: any) {
        if (arguments.length === 0) {
          // getter
          const result = originalVal.call(this);
          if (result && typeof result === 'string' && result.length > 2) {
            this.each(function(this: any) {
              if (this.tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(this.tagName)) {
                notifyFieldAccess(this, 'property', 'jQuery.val()');
              }
            });
          }
          return result;
        } else {
          // setter
          return originalVal.call(this, value);
        }
      };
    }
  };

  // 检查并hook jQuery
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkJQuery);
  } else {
    checkJQuery();
  }

  function notifyFieldAccess(element: Element, accessType: string, method: string): void {
    // 节流控制，避免过度通知
    const now = Date.now();
    const key = getElementSelector(element) + accessType;
    const win = window as any;
    
    if (!win._fpwLastNotify) win._fpwLastNotify = {};
    if (win._fpwLastNotify[key] && now - win._fpwLastNotify[key] < 1000) {
      return;
    }
    win._fpwLastNotify[key] = now;

    const stackTrace = new Error().stack || '';
    
    // 修改：为了测试，暂时报告所有访问，不仅仅是第三方
    // const isThirdParty = checkIfThirdParty(stackTrace);
    const isThirdParty = true; // 临时改为总是报告
    
    if (isThirdParty) {
      window.postMessage({
        type: 'FORM_FIELD_ACCESS',
        fieldSelector: getElementSelector(element),
        accessType,
        method,
        stackTrace,
        timestamp: now
      }, '*');
    }
  }

  function notifyFormSerialization(form: HTMLFormElement, method: string): void {
    const formData = new (window as any).FormData(form);
    const fields: string[] = [];
    
    // 使用 Array.from 来处理 FormData.entries()
    try {
      const entries = Array.from(formData.entries()) as [string, any][];
      entries.forEach(([name, value]) => {
        if (typeof value === 'string' && value.length > 2) {
          fields.push(name);
        }
      });
    } catch (e) {
      // 兼容性处理
      console.debug('FormData.entries() not supported');
    }

    if (fields.length > 0) {
      window.postMessage({
        type: 'FORM_SERIALIZATION',
        formSelector: getElementSelector(form),
        fields,
        method,
        stackTrace: new Error().stack || '',
        timestamp: Date.now()
      }, '*');
    }
  }

  function getElementSelector(element: Element): string {
    if (element.id) return `#${element.id}`;
    
    const el = element as any;
    if (el.name) return `[name="${el.name}"]`;
    
    let selector = element.tagName.toLowerCase();
    if (element.className) {
      selector += '.' + element.className.split(' ').join('.');
    }
    
    return selector;
  }

  function checkIfThirdParty(stackTrace: string): boolean {
    const currentOrigin = window.location.origin;
    const lines = stackTrace.split('\n');
    
    for (const line of lines) {
      const urlMatch = line.match(/https?:\/\/[^\/\s)]+/);
      if (urlMatch) {
        const url = urlMatch[0];
        try {
          const urlOrigin = new URL(url).origin;
          if (urlOrigin !== currentOrigin) {
            return true;
          }
        } catch (e) {
          // 忽略无效URL
        }
      }
    }
    
    return false;
  }

  // 监控网络请求中的数据传输
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input.toString();
    
    if (init?.body) {
      checkRequestBody(url, init.body, 'fetch');
    }
    
    return originalFetch.apply(this, arguments as any);
  };

  const originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
    if (body) {
      checkRequestBody(this.responseURL || 'unknown', body, 'XMLHttpRequest');
    }
    
    return originalXHRSend.call(this, body);
  };

  function checkRequestBody(url: string, body: any, method: string): void {
    let bodyStr = '';
    
    if (typeof body === 'string') {
      bodyStr = body;
    } else if (body instanceof FormData) {
      // FormData 已在上面处理
      return;
    } else if (body instanceof URLSearchParams) {
      bodyStr = body.toString();
    } else if (body && typeof body === 'object') {
      try {
        bodyStr = JSON.stringify(body);
      } catch (e) {
        return;
      }
    }

    if (bodyStr.length > 10) {
      window.postMessage({
        type: 'NETWORK_REQUEST_BODY',
        url,
        body: bodyStr,
        method,
        timestamp: Date.now()
      }, '*');
    }
  }

  console.debug('Form Privacy Watcher: Injected script loaded');
})();
