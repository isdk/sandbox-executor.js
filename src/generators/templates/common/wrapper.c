#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "cJSON.h"

#define START_MARKER "__SANDBOX_RESULT_START__"
#define END_MARKER "__SANDBOX_RESULT_END__"

cJSON* __sandbox_dispatch(cJSON* params);

int main() {
    // Inline arguments as JSON string literal
    const char *args_json = "{{ARGS_JSON}}";
    
    cJSON *json = cJSON_Parse(args_json);
    if (json == NULL) {
        cJSON *err_res = cJSON_CreateObject();
        cJSON_AddItemToObject(err_res, "success", cJSON_CreateBool(0));
        cJSON *error = cJSON_CreateObject();
        cJSON_AddItemToObject(err_res, "error", error);
        cJSON_AddItemToObject(error, "message", cJSON_CreateString("Failed to parse inline JSON"));
        cJSON_AddItemToObject(error, "type", cJSON_CreateString("ParseError"));
        cJSON_AddItemToObject(error, "data", cJSON_CreateString(args_json));
        char *err_out = cJSON_PrintUnformatted(err_res);
        printf("%s\n%s\n%s\n", START_MARKER, err_out, END_MARKER);
        free(err_out);
        cJSON_Delete(err_res);
        return 1;
    }

    cJSON *output = __sandbox_dispatch(json);
    char *out_str = cJSON_PrintUnformatted(output);
    printf("%s\n%s\n%s\n", START_MARKER, out_str, END_MARKER);

    free(out_str);
    cJSON_Delete(json);
    cJSON_Delete(output);
    return 0;
}

#include "cJSON.c"
#include "__sandbox_dispatcher.c"
