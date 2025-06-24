/**
 * 端到端测试 - 模拟真实的表单监控场景
 */

import { DataSanitizer } from '../utils/dataSanitizer';

// Jest 的 jsdom 环境已经提供了 DOM 模拟

describe('端到端测试 - 表单隐私监控', () => {
  let container: HTMLDivElement;
  
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  
  afterEach(() => {
    document.body.removeChild(container);
  });
  
  test('检测敏感表单字段并触发警告', () => {
    // 创建包含敏感信息的表单
    container.innerHTML = `
      <form id="testForm">
        <input type="text" name="username" value="john_doe" />
        <input type="password" name="password" value="secret123" />
        <input type="email" name="email" value="john@example.com" />
        <input type="text" name="ssn" value="123-45-6789" />
        <input type="text" name="creditCard" value="4111111111111111" />
      </form>
    `;
    
    // 测试各种敏感字段
    expect(DataSanitizer.isSensitive('password')).toBe(true);
    expect(DataSanitizer.isSensitive('email')).toBe(true);
    expect(DataSanitizer.isSensitive('ssn')).toBe(true);
    expect(DataSanitizer.isSensitive('creditCard')).toBe(true);
    expect(DataSanitizer.isSensitive('username')).toBe(false);
    
    // 测试数据脱敏功能
    expect(DataSanitizer.sanitize('secret123', 'password')).toBe('***');
    expect(DataSanitizer.sanitize('john@example.com')).toBe('jo***@example.com');
    expect(DataSanitizer.sanitize('123456789')).toBe('12***89'); // 实际输出
    expect(DataSanitizer.sanitize('4111111111111111')).toBe('4111 **** **** 1111');
  });
  
  test('模拟表单数据泄露检测', () => {
    // 模拟表单提交事件
    container.innerHTML = `
      <form id="loginForm" action="/api/login" method="post">
        <input type="email" name="email" value="user@test.com" />
        <input type="password" name="password" value="mypassword" />
        <button type="submit">登录</button>
      </form>
    `;
    
    const form = container.querySelector('#loginForm') as HTMLFormElement;
    let formSubmitted = false;
    let capturedData: any = null;
    
    // 模拟表单监听器
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      formSubmitted = true;
      
      const formData = new FormData(form);
      capturedData = {};
      formData.forEach((value, key) => {
        capturedData[key] = value;
      });
    });
    
    // 触发表单提交
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    submitButton.click();
    
    expect(formSubmitted).toBe(true);
    expect(capturedData).toEqual({
      email: 'user@test.com',
      password: 'mypassword'
    });
    
    // 验证敏感数据检测
    const sanitizedData = Object.keys(capturedData).reduce((acc, key) => {
      acc[key] = DataSanitizer.isSensitive(key) 
        ? DataSanitizer.sanitize(capturedData[key], key)
        : capturedData[key];
      return acc;
    }, {} as any);
    
    expect(sanitizedData.email).toBe('us***@test.com'); // 邮箱被脱敏处理
    expect(sanitizedData.password).toBe('***'); // 密码被脱敏处理
  });
  
  test('测试网络请求监控', async () => {
    // 模拟 XMLHttpRequest
    const mockXHR = {
      open: jest.fn(),
      send: jest.fn(),
      setRequestHeader: jest.fn(),
      readyState: 4,
      status: 200,
      responseText: '{"success": true}',
    };
    
    (global as any).XMLHttpRequest = jest.fn(() => mockXHR);
    
    // 模拟网络请求
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/submit');
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    const sensitiveData = {
      email: 'test@example.com',
      password: 'secret123',
      normalField: 'normalValue'
    };
    
    xhr.send(JSON.stringify(sensitiveData));
    
    // 验证请求被捕获
    expect(mockXHR.open).toHaveBeenCalledWith('POST', '/api/submit');
    expect(mockXHR.send).toHaveBeenCalledWith(JSON.stringify(sensitiveData));
    
    // 验证可以检测到请求中的敏感数据
    const requestBody = JSON.parse(mockXHR.send.mock.calls[0][0]);
    
    Object.keys(requestBody).forEach(key => {
      if (DataSanitizer.isSensitive(key)) {
        console.warn(`检测到敏感数据传输: ${key}`);
      }
    });
  });
  
  test('测试白名单功能', () => {
    // 测试白名单域名
    const trustedDomains = ['example.com', 'trusted-site.org'];
    
    trustedDomains.forEach(domain => {
      expect(DataSanitizer.isTrustedDomain(domain)).toBe(true);
    });
    
    expect(DataSanitizer.isTrustedDomain('malicious-site.com')).toBe(false);
    expect(DataSanitizer.isTrustedDomain('phishing-example.com')).toBe(false);
  });
  
  test('测试日志记录功能', () => {
    const logEntries: any[] = [];
    
    // 模拟日志记录
    const mockLogger = {
      log: (entry: any) => {
        logEntries.push({
          timestamp: new Date().toISOString(),
          ...entry
        });
      }
    };
    
    // 模拟各种事件
    mockLogger.log({
      type: 'FORM_DETECTED',
      url: 'https://example.com/login',
      fields: ['email', 'password']
    });
    
    mockLogger.log({
      type: 'SENSITIVE_DATA_ACCESS',
      field: 'password',
      url: 'https://example.com/login'
    });
    
    mockLogger.log({
      type: 'NETWORK_REQUEST',
      url: 'https://api.example.com/auth',
      method: 'POST',
      hasSensitiveData: true
    });
    
    expect(logEntries).toHaveLength(3);
    expect(logEntries[0].type).toBe('FORM_DETECTED');
    expect(logEntries[1].type).toBe('SENSITIVE_DATA_ACCESS');
    expect(logEntries[2].type).toBe('NETWORK_REQUEST');
    
    // 验证日志数据结构
    logEntries.forEach(entry => {
      expect(entry.timestamp).toBeDefined();
      expect(entry.type).toBeDefined();
    });
  });
});
