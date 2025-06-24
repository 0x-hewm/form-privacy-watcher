// 通用类型定义
export interface FormField {
  id: string;
  name: string;
  type: string;
  value: string;
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  lastModified: number;
}

export interface AccessEvent {
  fieldId: string;
  fieldName: string;
  accessTime: number;
  stackTrace: string;
  scriptOrigin: string;
  accessType: 'value' | 'attribute' | 'property';
}

export interface NetworkRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  initiator?: string;
  tabId: number;
}

export interface PrivacyViolation {
  id: string;
  timestamp: number;
  url: string;
  domain: string;
  fieldName: string;
  fieldType: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  stackTrace: string;
  scriptOrigin: string;
  targetUrl?: string;
  sensitizedValue?: string;
  requestMethod?: string;
  details: {
    fieldId: string;
    accessType: string;
    sanitizedValue: string;
    [key: string]: any;
  };
}

export interface WhitelistEntry {
  domain: string;
  path?: string;
  addedAt: number;
  reason?: string;
}

export interface ExtensionSettings {
  enabled: boolean;
  loggingEnabled: boolean;
  notificationsEnabled: boolean;
  sensitivityLevel: 'low' | 'medium' | 'high';
  whitelist: WhitelistEntry[];
  maxLogEntries: number;
}

export interface DetectionStats {
  totalViolations: number;
  todayViolations: number;
  blockedRequests: number;
  whitelistedSites: number;
}

// 消息类型定义
export type MessageType = 
  | 'FIELD_ACCESSED'
  | 'NETWORK_REQUEST'
  | 'VIOLATION_DETECTED'
  | 'VIOLATION_UPDATED'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'GET_VIOLATIONS'
  | 'UPDATE_VIOLATIONS'
  | 'GET_STATS'
  | 'ADD_WHITELIST'
  | 'REMOVE_WHITELIST'
  | 'CLEAR_LOGS'
  | 'EXPORT_LOGS';

export interface Message<T = any> {
  type: MessageType;
  data?: T;
  tabId?: number;
}

// 响应类型
export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
