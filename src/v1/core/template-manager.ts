import * as fs from 'fs';
import * as path from 'path';

export interface TemplateOptions {
  customPaths?: string[];
}

export class TemplateManager {
  private cache: Map<string, string> = new Map();
  private searchPaths: string[] = [];

  constructor(options: TemplateOptions = {}) {
    if (options.customPaths) {
      this.searchPaths.push(...options.customPaths);
    }
    
    // 默认搜索路径优先级：
    // 1. 如果有自定义路径，优先使用 (已经在 constructor 中添加)
    // 2. 尝试基于当前包结构定位语言模板
    //    在 src 下: src/v1/languages/[lang]/templates
    //    在 dist 下: dist/v1/languages/[lang]/templates
    const baseDir = path.resolve(__dirname, '..');
    this.searchPaths.push(path.join(baseDir, 'languages'));
    this.searchPaths.push(path.join(baseDir, 'templates'));
  }

  /**
   * 获取模板内容
   * @param lang 语言标识，如 'python', 'javascript', 'common'
   * @param name 模板名称，如 'universal_wrapper'
   * @param ext 扩展名，如 '.py', '.js'
   */
  async getTemplate(lang: string, name: string, ext: string): Promise<string> {
    const cacheKey = `${lang}:${name}${ext}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const fileName = `${name}${ext}`;
    
    // 尝试在 searchPaths 中查找
    // 预期路径格式：
    // - [path]/[lang]/templates/[fileName]
    // - [path]/[lang]/[fileName]
    // - [path]/common/[fileName]
    
    const possiblePaths: string[] = [];
    for (const basePath of this.searchPaths) {
      possiblePaths.push(path.join(basePath, lang, 'templates', fileName));
      possiblePaths.push(path.join(basePath, lang, fileName));
      possiblePaths.push(path.join(basePath, 'common', fileName));
    }

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        this.cache.set(cacheKey, content);
        return content;
      }
    }

    throw new Error(`Template not found: ${lang}/${fileName}. Searched in: ${possiblePaths.join(', ')}`);
  }

  /**
   * 注册搜索路径
   */
  addSearchPath(p: string) {
    this.searchPaths.unshift(p);
  }
}
