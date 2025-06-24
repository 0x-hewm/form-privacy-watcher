import CryptoJS from 'crypto-js';

export class DataSanitizer {
  private static readonly PHONE_REGEX = /^1[3-9]\d{9}$/;
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly ID_CARD_REGEX = /^\d{17}[\dX]$/;
  private static readonly CREDIT_CARD_REGEX = /^\d{13,19}$/;

  /**
   * 敏感数据脱敏处理
   */
  static sanitize(value: string, type?: string): string {
    if (!value || value.length < 4) return value;

    // 根据字段类型或值格式判断敏感程度
    if (this.PHONE_REGEX.test(value)) {
      return this.sanitizePhone(value);
    }
    
    if (this.EMAIL_REGEX.test(value)) {
      return this.sanitizeEmail(value);
    }
    
    if (this.ID_CARD_REGEX.test(value)) {
      return this.sanitizeIdCard(value);
    }
    
    if (this.CREDIT_CARD_REGEX.test(value.replace(/\s/g, ''))) {
      return this.sanitizeCreditCard(value);
    }

    // 根据字段类型脱敏
    if (type === 'password') {
      return '***';
    }

    // 通用文本脱敏
    return this.sanitizeGeneral(value);
  }

  private static sanitizePhone(phone: string): string {
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  }

  private static sanitizeEmail(email: string): string {
    const [local, domain] = email.split('@');
    const sanitizedLocal = local.length > 2 
      ? local.slice(0, 2) + '***' 
      : '***';
    return `${sanitizedLocal}@${domain}`;
  }

  private static sanitizeIdCard(id: string): string {
    return id.slice(0, 6) + '********' + id.slice(-4);
  }

  private static sanitizeCreditCard(card: string): string {
    const cleaned = card.replace(/\s/g, '');
    return cleaned.slice(0, 4) + ' **** **** ' + cleaned.slice(-4);
  }

  private static sanitizeGeneral(text: string): string {
    if (text.length <= 10) {
      return text.slice(0, 2) + '***' + text.slice(-2);
    }
    return text.slice(0, 5) + '***' + text.slice(-5);
  }

  /**
   * 创建数据哈希用于匹配
   */
  static createHash(value: string): string {
    return CryptoJS.SHA256(value.toLowerCase().trim()).toString();
  }

  /**
   * 创建部分哈希用于模糊匹配
   */
  static createPartialHash(value: string): string[] {
    const hashes: string[] = [];
    const cleaned = value.toLowerCase().trim();
    
    // 创建不同长度的子串哈希
    for (let i = 4; i <= Math.min(cleaned.length, 20); i += 2) {
      if (cleaned.length >= i) {
        const substr = cleaned.slice(0, i);
        hashes.push(CryptoJS.SHA256(substr).toString());
      }
    }
    
    return hashes;
  }

  /**
   * 检查字段名是否为敏感字段
   */
  static isSensitive(fieldName: string): boolean {
    const sensitiveNames = [
      'password', 'pass', 'pwd', 'passwd',
      'email', 'mail', 'e-mail',
      'phone', 'mobile', 'tel', 'telephone',
      'ssn', 'social', 'socialsecurity',
      'creditcard', 'credit-card', 'cardnumber',
      'cvv', 'cvc', 'ccv',
      'pin', 'bankaccount', 'account',
      'license', 'passport', 'id',
      'secret', 'token', 'key'
    ];
    
    const fieldLower = fieldName.toLowerCase();
    return sensitiveNames.some(name => fieldLower.includes(name));
  }

  /**
   * 检查值是否为敏感数据（基于内容）
   */
  static isSensitiveValue(value: string, fieldType?: string): boolean {
    if (!value || value.length < 4) return false;

    // 检查是否为常见敏感数据格式
    if (this.PHONE_REGEX.test(value) || 
        this.EMAIL_REGEX.test(value) || 
        this.ID_CARD_REGEX.test(value) ||
        this.CREDIT_CARD_REGEX.test(value.replace(/\s/g, ''))) {
      return true;
    }

    // 检查字段类型
    const sensitiveTypes = ['password', 'tel', 'email', 'ssn', 'credit-card'];
    if (fieldType && sensitiveTypes.includes(fieldType.toLowerCase())) {
      return true;
    }

    // 检查字段名称
    if (fieldType && this.isSensitive(fieldType)) {
      return true;
    }

    return false;
  }

  /**
   * 检查域名是否为可信域名
   */
  static isTrustedDomain(domain: string): boolean {
    const trustedDomains = [
      'localhost',
      '127.0.0.1',
      'example.com',
      'trusted-site.org',
      // 可以从配置文件或存储中加载更多可信域名
    ];
    
    return trustedDomains.includes(domain.toLowerCase());
  }
}
