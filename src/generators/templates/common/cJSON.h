
#ifndef cJSON__h
#define cJSON__h
#ifdef __cplusplus
extern "C" {
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
typedef struct cJSON {
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
