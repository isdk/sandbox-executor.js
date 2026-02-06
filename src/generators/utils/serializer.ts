/**
 * Utility for serializing JavaScript values into target language literals.
 */
export class Serializer {
  /**
   * Serializes a value for Python.
   */
  static python(value: any): string {
    if (value === null || value === undefined) return 'None';
    if (typeof value === 'boolean') return value ? 'True' : 'False';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map(v => this.python(v)).join(', ')}]`;
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value)
        .map(([k, v]) => `${JSON.stringify(k)}: ${this.python(v)}`);
      return `{${entries.join(', ')}}`;
    }
    return String(value);
  }

  /**
   * Serializes a value for Ruby.
   */
  static ruby(value: any): string {
    if (value === null || value === undefined) return 'nil';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return JSON.stringify(value).replace(/\$/g, '\\$');
    if (Array.isArray(value)) {
      return `[${value.map(v => this.ruby(v)).join(', ')}]`;
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value)
        .map(([k, v]) => `${JSON.stringify(k)} => ${this.ruby(v)}`);
      return `{${entries.join(', ')}}`;
    }
    return String(value);
  }

  /**
   * Serializes a value for PHP (php-cgi).
   */
  static phpCgi(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return JSON.stringify(value).replace(/\$/g, '\\$');
    if (Array.isArray(value)) {
      return '[' + value.map(v => this.phpCgi(v)).join(', ') + ']';
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value)
        .map(([k, v]) => `${JSON.stringify(k)} => ${this.phpCgi(v)}`);
      return '[' + entries.join(', ') + ']';
    }
    return String(value);
  }

  /**
   * Serializes a value for JavaScript/TypeScript.
   */
  static javascript(value: any): string {
    return JSON.stringify(value, null, 2);
  }

  /**
   * Serializes a value for C/C++.
   * Note: For complex types in inline mode, we often prefer JSON string literals.
   */
  static cpp(value: any): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
      // Return a C-style string literal with double escapes for use in templates
      return JSON.stringify(value);
    }
    // For arrays/objects, we return their JSON representation 
    // which will be further escaped when embedded in a C string literal.
    return JSON.stringify(value);
  }

  /**
   * Escapes a string for use inside a C string literal (e.g. "foo\"bar").
   */
  static escapeCString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\v/g, '\\v')
      .replace(/\f/g, '\\f');
  }
}
