/**
 * Sandbox-Link Protocol Specification v1.0
 */

export type MessageType = 'call' | 'result' | 'log' | 'error' | 'chunk' | 'ready' | 'control';

/**
 * SIP (Sandbox Input Protocol) Constants
 */
export const InputProtocol = {
  ATOMIC: 'A', // Atomic JSON payload
  STREAM: 'S', // Streaming chunks (future)
} as const;

export interface SandboxLinkHeader {
  ver: '1.0';
  id: string;           // 消息唯一标识，用于分片重组和响应匹配
  type: MessageType;
}

/**
 * 基础请求消息 (Host -> Sandbox)
 */
export interface CallMessage extends SandboxLinkHeader {
  type: 'call';
  method: string;
  params: {
    args: any[];
    kwargs: Record<string, any>;
  };
  config?: {
    reset?: 'none' | 'module' | 'context'; // 状态重置级别
    timeout?: number;
    report_io?: boolean;
  };
}

/**
 * 基础响应消息 (Sandbox -> Host)
 */
export interface ResultMessage extends SandboxLinkHeader {
  type: 'result';
  status: 'ok' | 'fail' | 'timeout';
  data: {
    result?: any;
    error?: {
      message: string;
      type: string;
      stack?: string;
    } | null;
  };
  meta?: {
    duration?: number;
    memory?: number;
  };
}

/**
 * 分片传输消息 (双向)
 */
export interface ChunkMessage extends SandboxLinkHeader {
  type: 'chunk';
  index: number;        // 当前分片索引 (0-based)
  total: number;        // 总分片数
  data: string;         // 分片内容 (通常是 Base64 或原始字符串片段)
}

/**
 * 日志流消息 (Sandbox -> Host)
 */
export interface LogMessage extends SandboxLinkHeader {
  type: 'log';
  stream: 'stdout' | 'stderr';
  content: string;
}

/**
 * 错误消息 (通常用于协议层错误)
 */
export interface ErrorMessage extends SandboxLinkHeader {
  type: 'error';
  code: string;
  message: string;
}

/**
 * 就绪消息 (Sandbox -> Host, 用于常驻模式)
 */
export interface ReadyMessage extends SandboxLinkHeader {
  type: 'ready';
  version: string;
  capabilities: string[];
}

export type SandboxLinkMessage = 
  | CallMessage 
  | ResultMessage 
  | ChunkMessage 
  | LogMessage 
  | ErrorMessage 
  | ReadyMessage;
