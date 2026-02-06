#include <string.h>
#include <stdio.h>
#include <math.h>
#include <stdlib.h>
#include <float.h>
#include <limits.h>
#include <ctype.h>
#include "cJSON.h"

static const char *parse_value(cJSON *item, const char *value);
cJSON *cJSON_CreateObject(void) { cJSON *item = (cJSON*)malloc(sizeof(cJSON)); memset(item, 0, sizeof(cJSON)); item->type = cJSON_Object; return item; }
cJSON *cJSON_CreateArray(void) { cJSON *item = (cJSON*)malloc(sizeof(cJSON)); memset(item, 0, sizeof(cJSON)); item->type = cJSON_Array; return item; }
cJSON *cJSON_CreateNumber(double num) { cJSON *item = (cJSON*)malloc(sizeof(cJSON)); memset(item, 0, sizeof(cJSON)); item->type = cJSON_Number; item->valuedouble = num; item->valueint = (int)num; return item; }
cJSON *cJSON_CreateString(const char *string) { cJSON *item = (cJSON*)malloc(sizeof(cJSON)); memset(item, 0, sizeof(cJSON)); item->type = cJSON_String; item->valuestring = strdup(string); return item; }
cJSON *cJSON_CreateBool(int b) { cJSON *item = (cJSON*)malloc(sizeof(cJSON)); memset(item, 0, sizeof(cJSON)); item->type = b ? cJSON_True : cJSON_False; return item; }
cJSON *cJSON_CreateNull(void) { cJSON *item = (cJSON*)malloc(sizeof(cJSON)); memset(item, 0, sizeof(cJSON)); item->type = cJSON_NULL; return item; }
void cJSON_AddItemToArray(cJSON *array, cJSON *item) { cJSON *c = array->child; if (!c) { array->child = item; } else { while (c->next) c = c->next; c->next = item; item->prev = c; } }
void cJSON_AddItemToObject(cJSON *object, const char *string, cJSON *item) { item->string = strdup(string); cJSON_AddItemToArray(object, item); }
void cJSON_Delete(cJSON *c) { cJSON *next; while (c) { next = c->next; if (!(c->type & cJSON_IsReference) && c->child) cJSON_Delete(c->child); if (!(c->type & cJSON_IsReference) && c->valuestring) free(c->valuestring); if (!(c->type & cJSON_StringIsConst) && c->string) free(c->string); free(c); c = next; } }
cJSON *cJSON_GetArrayItem(const cJSON *array, int index) { cJSON *c = array ? array->child : NULL; while (c && index > 0) index--, c = c->next; return c; }
cJSON *cJSON_GetObjectItem(const cJSON * const object, const char * const string) { cJSON *c = object ? object->child : NULL; while (c && strcmp(c->string, string)) c = c->next; return c; }
static const char *skip(const char *in) { while (in && *in && (unsigned char)*in <= 32) in++; return in; }
static const char *parse_number(cJSON *item, const char *num) { char *endptr; item->valuedouble = strtod(num, &endptr); item->valueint = (int)item->valuedouble; item->type = cJSON_Number; return endptr; }
static const char *parse_string(cJSON *item, const char *str) { if (*str != '\"') return NULL; const char *ptr = str + 1; while (*ptr && *ptr != '\"') ptr++; if (*ptr != '\"') return NULL; int len = ptr - str - 1; item->valuestring = (char*)malloc(len + 1); memcpy(item->valuestring, str + 1, len); item->valuestring[len] = '\0'; item->type = cJSON_String; return ptr + 1; }
static const char *parse_array(cJSON *item, const char *value) { cJSON *child; item->type = cJSON_Array; value = skip(value + 1); if (*value == ']') return value + 1; item->child = child = (cJSON*)malloc(sizeof(cJSON)); memset(child, 0, sizeof(cJSON)); value = skip(parse_value(child, skip(value))); if (!value) return NULL; while (*value == ',') { cJSON *new_item = (cJSON*)malloc(sizeof(cJSON)); memset(new_item, 0, sizeof(cJSON)); child->next = new_item; new_item->prev = child; child = new_item; value = skip(parse_value(child, skip(value + 1))); if (!value) return NULL; } if (*value == ']') return value + 1; return NULL; }
static const char *parse_object(cJSON *item, const char *value) { cJSON *child; item->type = cJSON_Object; value = skip(value + 1); if (*value == '}') return value + 1; item->child = child = (cJSON*)malloc(sizeof(cJSON)); memset(child, 0, sizeof(cJSON)); value = skip(parse_string(child, skip(value))); if (!value || *value != ':') return NULL; child->string = child->valuestring; child->valuestring = NULL; value = skip(parse_value(child, skip(value + 1))); if (!value) return NULL; while (*value == ',') { cJSON *new_item = (cJSON*)malloc(sizeof(cJSON)); memset(new_item, 0, sizeof(cJSON)); child->next = new_item; new_item->prev = child; child = new_item; value = skip(parse_string(child, skip(value + 1))); if (!value || *value != ':') return NULL; child->string = child->valuestring; child->valuestring = NULL; value = skip(parse_value(child, skip(value + 1))); if (!value) return NULL; } if (*value == '}') return value + 1; return NULL; }
static const char *parse_value(cJSON *item, const char *value) { if (!value) return NULL; if (!strncmp(value, "null", 4)) { item->type = cJSON_NULL; return value + 4; } if (!strncmp(value, "false", 5)) { item->type = cJSON_False; return value + 5; } if (!strncmp(value, "true", 4)) { item->type = cJSON_True; return value + 4; } if (*value == '\"') return parse_string(item, value); if (*value == '-' || (*value >= '0' && *value <= '9')) return parse_number(item, value); if (*value == '[') return parse_array(item, value); if (*value == '{') return parse_object(item, value); return NULL; }
cJSON *cJSON_Parse(const char *value) { cJSON *c = (cJSON*)malloc(sizeof(cJSON)); memset(c, 0, sizeof(cJSON)); if (!parse_value(c, skip(value))) { cJSON_Delete(c); return NULL; } return c; }

static void print_value(const cJSON *item, char **out, int *len, int *cap) {
    if (!item) return;
    char buffer[64];
    int needed = 0;
    if (item->type == cJSON_String) {
        needed = strlen(item->valuestring) + 3;
    } else if (item->type == cJSON_Number) {
        needed = sprintf(buffer, "%g", item->valuedouble) + 1;
    } else {
        needed = 10; // For null, true, false, etc.
    }

    if (*len + needed + 10 > *cap) {
        *cap = (*cap + needed) * 2;
        *out = (char*)realloc(*out, *cap);
    }

    if (item->type == cJSON_String) {
        *len += sprintf(*out + *len, "\"%s\"", item->valuestring);
    } else if (item->type == cJSON_Number) {
        *len += sprintf(*out + *len, "%s", buffer);
    } else if (item->type == cJSON_True) {
        *len += sprintf(*out + *len, "true");
    } else if (item->type == cJSON_False) {
        *len += sprintf(*out + *len, "false");
    } else if (item->type == cJSON_NULL) {
        *len += sprintf(*out + *len, "null");
    } else if (item->type == cJSON_Object) {
        *len += sprintf(*out + *len, "{");
        cJSON *c = item->child;
        while (c) {
            int keyLen = strlen(c->string) + 5;
            if (*len + keyLen > *cap) { *cap *= 2; *out = (char*)realloc(*out, *cap); }
            *len += sprintf(*out + *len, "\"%s\":", c->string);
            print_value(c, out, len, cap);
            if (c->next) {
                if (*len + 2 > *cap) { *cap *= 2; *out = (char*)realloc(*out, *cap); }
                *len += sprintf(*out + *len, ",");
            }
            c = c->next;
        }
        *len += sprintf(*out + *len, "}");
    } else if (item->type == cJSON_Array) {
        *len += sprintf(*out + *len, "[");
        cJSON *c = item->child;
        while (c) {
            print_value(c, out, len, cap);
            if (c->next) {
                if (*len + 2 > *cap) { *cap *= 2; *out = (char*)realloc(*out, *cap); }
                *len += sprintf(*out + *len, ",");
            }
            c = c->next;
        }
        *len += sprintf(*out + *len, "]");
    }
}

char *cJSON_PrintUnformatted(const cJSON *item) {
    int cap = 1024;
    int len = 0;
    char *out = (char*)malloc(cap);
    if (out) print_value(item, &out, &len, &cap);
    return out;
}