import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TemplateManager } from '../../../src/v1/core/template-manager';

vi.mock('fs');

describe('TemplateManager', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('应该能按优先级从多个子目录中查找模板', async () => {
    const manager = new TemplateManager();
    const mockExists = vi.mocked(fs.existsSync);
    const mockRead = vi.mocked(fs.readFileSync);

    // 模拟第一个路径不存在，第二个路径存在
    mockExists.mockImplementation((p: any) => p.includes('python/templates/universal_wrapper.py'));
    mockRead.mockReturnValue('content from templates dir');

    const content = await manager.getTemplate('python', 'universal_wrapper', '.py');
    
    expect(content).toBe('content from templates dir');
    expect(mockExists).toHaveBeenCalled();
  });

  it('应该支持 common 目录作为兜底', async () => {
    const manager = new TemplateManager();
    const mockExists = vi.mocked(fs.existsSync);
    const mockRead = vi.mocked(fs.readFileSync);

    mockExists.mockImplementation((p: any) => p.includes('common/cJSON.h'));
    mockRead.mockReturnValue('common cJSON header');

    const content = await manager.getTemplate('c', 'cJSON', '.h');
    
    expect(content).toBe('common cJSON header');
  });

  it('构造函数传入的 customPaths 应该具有最高优先级', async () => {
    const customPath = '/custom/path';
    const manager = new TemplateManager({ customPaths: [customPath] });
    const mockExists = vi.mocked(fs.existsSync);
    
    mockExists.mockImplementation((p: any) => p.startsWith(customPath));
    vi.mocked(fs.readFileSync).mockReturnValue('custom content');

    const content = await manager.getTemplate('python', 'test', '.py');
    
    expect(content).toBe('custom content');
    // 确认第一次查找就是 customPath 相关的路径
    expect(mockExists.mock.calls[0][0]).toContain(customPath);
  });

  it('addSearchPath 应该将新路径置于最高优先级', async () => {
    const manager = new TemplateManager();
    const urgentPath = '/urgent/templates';
    manager.addSearchPath(urgentPath);
    
    const mockExists = vi.mocked(fs.existsSync);
    mockExists.mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('urgent content');

    await manager.getTemplate('js', 'main', '.js');
    
    expect(mockExists.mock.calls[0][0]).toContain(urgentPath);
  });

  it('应该具备缓存机制，避免重复读取磁盘', async () => {
    const manager = new TemplateManager();
    const mockExists = vi.mocked(fs.existsSync).mockReturnValue(true);
    const mockRead = vi.mocked(fs.readFileSync).mockReturnValue('cached content');

    // 第一次读取
    await manager.getTemplate('python', 'wrapper', '.py');
    // 第二次读取
    const content = await manager.getTemplate('python', 'wrapper', '.py');

    expect(content).toBe('cached content');
    expect(mockRead).toHaveBeenCalledTimes(1); // 关键：只调用了一次 readFileSync
  });

  it('找不到模板时应抛出详细的错误信息', async () => {
    const manager = new TemplateManager();
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await expect(manager.getTemplate('nonexist', 'file', '.txt'))
      .rejects.toThrow(/Template not found: nonexist\/file.txt/);
  });
});
