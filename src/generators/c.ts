import { CodeGenerator } from './base';
import type { InferredSignature } from '../inference/engine';

const C_PROXY_MAIN = `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "cJSON.h"

// Result markers
#define START_MARKER "__SANDBOX_RESULT_START__"
#define END_MARKER "__SANDBOX_RESULT_END__"

// Prototype for generated dispatcher
cJSON* __sandbox_dispatch(cJSON* params);

int main() {
    // 1. Read protocol header: [Mode(1b)][Length(4b)]
    unsigned char header[5];
    for (int i = 0; i < 5; i++) {
        int c = getchar();
        if (c == EOF) return 0;
        header[i] = (unsigned char)c;
    }

    char mode = (char)header[0];
    unsigned int length = (header[1] << 24) | (header[2] << 16) | (header[3] << 8) | header[4];

    if (mode == 'A') {
        char *buffer = malloc(length + 1);
        for (unsigned int i = 0; i < length; i++) {
            int c = getchar();
            if (c == EOF) break;
            buffer[i] = (char)c;
        }
        buffer[length] = '\\0';

        cJSON *json = cJSON_Parse(buffer);
        if (json == NULL) {
            printf("%s\\n{\\"success\\": false, \\"error\\": {\\"message\\": \\"Failed to parse stdin JSON\\", \\"type\\": \\"ParseError\\"}} \\n%s\\n", START_MARKER, END_MARKER);
            free(buffer);
            return 0;
        }

        cJSON *output = __sandbox_dispatch(json);

        char *out_str = cJSON_PrintUnformatted(output);
        printf("%s\\n%s\\n%s\\n", START_MARKER, out_str, END_MARKER);

        free(buffer);
        free(out_str);
        cJSON_Delete(json);
        cJSON_Delete(output);
    }
    return 0;
}

#include "cJSON.c"
#include "__sandbox_dispatcher.c"
`;

// A very minimal cJSON implementation subset (only what's needed)
const CJSON_H = `
#ifndef cJSON__h
#define cJSON__h

#ifdef __cplusplus
extern "C"
{
#endif

#define cJSON_Invalid (0)
#define cJSON_False  (1 << 0)
#define cJSON_True   (1 << 1)
#define cJSON_NULL   (1 << 2)
#define cJSON_Number (1 << 3)
#define cJSON_String (1 << 4)
#define cJSON_Array  (1 << 5)
#define cJSON_Object (1 << 6)
#define cJSON_IsReference 256
#define cJSON_StringIsConst 512

typedef struct cJSON
{
    struct cJSON *next;
    struct cJSON *prev;
    struct cJSON *child;
    int type;
    char *valuestring;
    int valueint;
    double valuedouble;
    char *string;
} cJSON;

extern cJSON *cJSON_Parse(const char *value);
extern char  *cJSON_PrintUnformatted(const cJSON *item);
extern void   cJSON_Delete(cJSON *c);
extern int    cJSON_GetArraySize(const cJSON *array);
extern cJSON *cJSON_GetArrayItem(const cJSON *array, int index);
extern cJSON *cJSON_GetObjectItem(const cJSON * const object, const char * const string);
extern cJSON *cJSON_CreateObject(void);
extern cJSON *cJSON_CreateArray(void);
extern cJSON *cJSON_CreateNumber(double num);
extern cJSON *cJSON_CreateString(const char *string);
extern cJSON *cJSON_CreateBool(int b);
extern cJSON *cJSON_CreateNull(void);
extern void   cJSON_AddItemToArray(cJSON *array, cJSON *item);
extern void   cJSON_AddItemToObject(cJSON *object, const char *string, cJSON *item);

#ifdef __cplusplus
}
#endif

#endif
`;

const CJSON_C = `
#include <string.h>
#include <stdio.h>
#include <math.h>
#include <stdlib.h>
#include <float.h>
#include <limits.h>
#include <ctype.h>
#include "cJSON.h"

// Extremely simplified cJSON-like parser and printer for demonstration
// In a real production environment, we'd use the full cJSON library.

static const char *parse_value(cJSON *item, const char *value);

cJSON *cJSON_CreateObject(void) {
    cJSON *item = (cJSON*)malloc(sizeof(cJSON));
    memset(item, 0, sizeof(cJSON));
    item->type = cJSON_Object;
    return item;
}

cJSON *cJSON_CreateArray(void) {
    cJSON *item = (cJSON*)malloc(sizeof(cJSON));
    memset(item, 0, sizeof(cJSON));
    item->type = cJSON_Array;
    return item;
}

cJSON *cJSON_CreateNumber(double num) {
    cJSON *item = (cJSON*)malloc(sizeof(cJSON));
    memset(item, 0, sizeof(cJSON));
    item->type = cJSON_Number;
    item->valuedouble = num;
    item->valueint = (int)num;
    return item;
}

cJSON *cJSON_CreateString(const char *string) {
    cJSON *item = (cJSON*)malloc(sizeof(cJSON));
    memset(item, 0, sizeof(cJSON));
    item->type = cJSON_String;
    item->valuestring = strdup(string);
    return item;
}

cJSON *cJSON_CreateBool(int b) {
    cJSON *item = (cJSON*)malloc(sizeof(cJSON));
    memset(item, 0, sizeof(cJSON));
    item->type = b ? cJSON_True : cJSON_False;
    return item;
}

cJSON *cJSON_CreateNull(void) {
    cJSON *item = (cJSON*)malloc(sizeof(cJSON));
    memset(item, 0, sizeof(cJSON));
    item->type = cJSON_NULL;
    return item;
}

void cJSON_AddItemToArray(cJSON *array, cJSON *item) {
    cJSON *c = array->child;
    if (!c) {
        array->child = item;
    } else {
        while (c->next) c = c->next;
        c->next = item;
        item->prev = c;
    }
}

void cJSON_AddItemToObject(cJSON *object, const char *string, cJSON *item) {
    item->string = strdup(string);
    cJSON_AddItemToArray(object, item);
}

void cJSON_Delete(cJSON *c) {
    cJSON *next;
    while (c) {
        next = c->next;
        if (!(c->type & cJSON_IsReference) && c->child) cJSON_Delete(c->child);
        if (!(c->type & cJSON_IsReference) && c->valuestring) free(c->valuestring);
        if (!(c->type & cJSON_StringIsConst) && c->string) free(c->string);
        free(c);
        c = next;
    }
}

cJSON *cJSON_GetArrayItem(const cJSON *array, int index) {
    cJSON *c = array ? array->child : NULL;
    while (c && index > 0) index--, c = c->next;
    return c;
}

cJSON *cJSON_GetObjectItem(const cJSON * const object, const char * const string) {
    cJSON *c = object ? object->child : NULL;
    while (c && strcmp(c->string, string)) c = c->next;
    return c;
}

// Minimal Parser (Only for simple objects/arrays/strings/numbers)
static const char *skip(const char *in) { while (in && *in && (unsigned char)*in <= 32) in++; return in; }

static const char *parse_number(cJSON *item, const char *num) {
    char *endptr;
    item->valuedouble = strtod(num, &endptr);
    item->valueint = (int)item->valuedouble;
    item->type = cJSON_Number;
    return endptr;
}

static const char *parse_string(cJSON *item, const char *str) {
    if (*str != '\"') return NULL;
    const char *ptr = str + 1;
    while (*ptr && *ptr != '\"') ptr++;
    if (*ptr != '\"') return NULL;
    int len = ptr - str - 1;
    item->valuestring = (char*)malloc(len + 1);
    memcpy(item->valuestring, str + 1, len);
    item->valuestring[len] = '\\0';
    item->type = cJSON_String;
    return ptr + 1;
}

static const char *parse_array(cJSON *item, const char *value) {
    cJSON *child;
    item->type = cJSON_Array;
    value = skip(value + 1);
    if (*value == ']') return value + 1;
    item->child = child = (cJSON*)malloc(sizeof(cJSON));
    memset(child, 0, sizeof(cJSON));
    value = skip(parse_value(child, skip(value)));
    if (!value) return NULL;
    while (*value == ',') {
        cJSON *new_item = (cJSON*)malloc(sizeof(cJSON));
        memset(new_item, 0, sizeof(cJSON));
        child->next = new_item;
        new_item->prev = child;
        child = new_item;
        value = skip(parse_value(child, skip(value + 1)));
        if (!value) return NULL;
    }
    if (*value == ']') return value + 1;
    return NULL;
}

static const char *parse_object(cJSON *item, const char *value) {
    cJSON *child;
    item->type = cJSON_Object;
    value = skip(value + 1);
    if (*value == '}') return value + 1;
    item->child = child = (cJSON*)malloc(sizeof(cJSON));
    memset(child, 0, sizeof(cJSON));
    value = skip(parse_string(child, skip(value)));
    if (!value || *value != ':') return NULL;
    child->string = child->valuestring;
    child->valuestring = NULL;
    value = skip(parse_value(child, skip(value + 1)));
    if (!value) return NULL;
    while (*value == ',') {
        cJSON *new_item = (cJSON*)malloc(sizeof(cJSON));
        memset(new_item, 0, sizeof(cJSON));
        child->next = new_item;
        new_item->prev = child;
        child = new_item;
        value = skip(parse_string(child, skip(value + 1)));
        if (!value || *value != ':') return NULL;
        child->string = child->valuestring;
        child->valuestring = NULL;
        value = skip(parse_value(child, skip(value + 1)));
        if (!value) return NULL;
    }
    if (*value == '}') return value + 1;
    return NULL;
}

static const char *parse_value(cJSON *item, const char *value) {
    if (!value) return NULL;
    if (!strncmp(value, "null", 4)) { item->type = cJSON_NULL; return value + 4; }
    if (!strncmp(value, "false", 5)) { item->type = cJSON_False; return value + 5; }
    if (!strncmp(value, "true", 4)) { item->type = cJSON_True; return value + 4; }
    if (*value == '\"') return parse_string(item, value);
    if (*value == '-' || (*value >= '0' && *value <= '9')) return parse_number(item, value);
    if (*value == '[') return parse_array(item, value);
    if (*value == '{') return parse_object(item, value);
    return NULL;
}

cJSON *cJSON_Parse(const char *value) {
    cJSON *c = (cJSON*)malloc(sizeof(cJSON));
    memset(c, 0, sizeof(cJSON));
    if (!parse_value(c, skip(value))) { cJSON_Delete(c); return NULL; }
    return c;
}

char *cJSON_PrintUnformatted(const cJSON *item) {
    char *out = (char*)malloc(1024); // Hardcoded buffer for simplicity
    if (item->type == cJSON_String) sprintf(out, "\\"%s\\"", item->valuestring);
    else if (item->type == cJSON_Number) sprintf(out, "%g", item->valuedouble);
    else if (item->type == cJSON_True) strcpy(out, "true");
    else if (item->type == cJSON_False) strcpy(out, "false");
    else if (item->type == cJSON_NULL) strcpy(out, "null");
    else if (item->type == cJSON_Object) {
        strcpy(out, "{");
        cJSON *c = item->child;
        while (c) {
            strcat(out, "\\""); strcat(out, c->string); strcat(out, "\\":");
            char *tmp = cJSON_PrintUnformatted(c);
            strcat(out, tmp); free(tmp);
            if (c->next) strcat(out, ",");
            c = c->next;
        }
        strcat(out, "}");
    }
    else if (item->type == cJSON_Array) {
        strcpy(out, "[");
        cJSON *c = item->child;
        while (c) {
            char *tmp = cJSON_PrintUnformatted(c);
            strcat(out, tmp); free(tmp);
            if (c->next) strcat(out, ",");
            c = c->next;
        }
        strcat(out, "]");
    }
    return out;
}
`;

export class CGenerator extends CodeGenerator {
  readonly language = 'clang';
  readonly fileExtension = '.c';

  generateFiles(
    userCode: string,
    functionName: string,
    _args: unknown[],
    _kwargs: Record<string, unknown>,
    signature: InferredSignature
  ): Record<string, string | Uint8Array> {
    const dispatcher = this.generateDispatcher(functionName, signature);
    return {
      [`main${this.fileExtension}`]: C_PROXY_MAIN,
      [`user_code${this.fileExtension}`]: userCode,
      [`__sandbox_dispatcher${this.fileExtension}`]: dispatcher,
      [`cJSON.h`]: CJSON_H,
      [`cJSON.c`]: CJSON_C,
    };
  }

  generateStdin(
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>
  ): string | Uint8Array {
    return this.buildAtomicStdin({
      functionName,
      args,
      kwargs
    });
  }

  private generateDispatcher(functionName: string, signature: InferredSignature): string {
    const params = signature.params;
    let extractParamsCode = '';
    const callArgs: string[] = [];

    params.forEach((param, idx) => {
      const argName = `arg_${idx}`;
      callArgs.push(argName);
      let extraction = '';
      
      // Basic type mapping for C
      const type = param.type || 'number';
      if (type === 'number') {
        extraction = `double ${argName} = cJSON_GetArrayItem(args, ${idx})->valuedouble;`;
      } else if (type === 'string') {
        extraction = `const char* ${argName} = cJSON_GetArrayItem(args, ${idx})->valuestring;`;
      } else if (type === 'boolean') {
        extraction = `bool ${argName} = cJSON_GetArrayItem(args, ${idx})->type == cJSON_True;`;
      } else {
        extraction = `double ${argName} = cJSON_GetArrayItem(args, ${idx})->valuedouble;`;
      }
      
      extractParamsCode += `    ${extraction}\n`;
    });

    // Return type handling
    const returnType = (signature as any).returnType || 'double';
    let callAndReturnCode = '';
    
    if (returnType === 'void') {
      callAndReturnCode = `
    ${functionName}(${callArgs.join(', ')});
    cJSON *res = cJSON_CreateObject();
    cJSON_AddItemToObject(res, "success", cJSON_CreateBool(1));
    cJSON_AddItemToObject(res, "result", cJSON_CreateNull());
    return res;
`;
    } else {
      let createResultCode = '';
      if (returnType === 'string' || returnType === 'char*') {
        createResultCode = `cJSON_CreateString(${functionName}(${callArgs.join(', ')}))`;
      } else if (returnType === 'boolean' || returnType === 'bool') {
        createResultCode = `cJSON_CreateBool(${functionName}(${callArgs.join(', ')}))`;
      } else {
        createResultCode = `cJSON_CreateNumber(${functionName}(${callArgs.join(', ')}))`;
      }

      callAndReturnCode = `
    cJSON *res = cJSON_CreateObject();
    cJSON_AddItemToObject(res, "success", cJSON_CreateBool(1));
    cJSON_AddItemToObject(res, "result", ${createResultCode});
    return res;
`;
    }

    return `
#include <stdbool.h>
#include "cJSON.h"
#include "user_code.c"

cJSON* __sandbox_dispatch(cJSON* params) {
    cJSON *args = cJSON_GetObjectItem(params, "args");
${extractParamsCode}
${callAndReturnCode}
}
`;
  }

  protected generateWrapper(
    _functionName: string,
    _args: unknown[],
    _kwargs: Record<string, unknown>,
    _signature: InferredSignature
  ): string {
    return '';
  }

  protected serialize(value: unknown): string {
    if (value === null || value === undefined) return '0';
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') return String(value);
    return '0';
  }
}
