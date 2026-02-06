#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "cJSON.h"

#define START_MARKER "__SANDBOX_RESULT_START__"
#define END_MARKER "__SANDBOX_RESULT_END__"

cJSON* __sandbox_dispatch(cJSON* params);

int main() {
    char header[10];
    for (int i = 0; i < 9; i++) {
        int c = getchar();
        if (c == EOF) return 0;
        header[i] = (char)c;
    }
    header[9] = '\0';

    char mode = header[0];
    unsigned int length = (unsigned int)strtoul(&header[1], NULL, 16);

    if (mode == 'A') {
        char *buffer = (char *)malloc(length + 1);
        for (unsigned int i = 0; i < length; i++) {
            int c = getchar();
            if (c == EOF) break;
            buffer[i] = (char)c;
        }
        buffer[length] = '\0';

        cJSON *json = cJSON_Parse(buffer);
        if (json == NULL) {
            cJSON *err_res = cJSON_CreateObject();
            cJSON_AddItemToObject(err_res, "success", cJSON_CreateBool(0));
            cJSON *error = cJSON_CreateObject();
            cJSON_AddItemToObject(err_res, "error", error);
            cJSON_AddItemToObject(error, "message", cJSON_CreateString("Failed to parse stdin JSON"));
            cJSON_AddItemToObject(error, "type", cJSON_CreateString("ParseError"));
            cJSON_AddItemToObject(error, "data", cJSON_CreateString(buffer));
            char *err_out = cJSON_PrintUnformatted(err_res);
            printf("%s\n%s\n%s\n", START_MARKER, err_out, END_MARKER);
            free(err_out);
            cJSON_Delete(err_res);
            free(buffer);
            return 0;
        }

        cJSON *output = __sandbox_dispatch(json);
        char *out_str = cJSON_PrintUnformatted(output);
        printf("%s\n%s\n%s\n", START_MARKER, out_str, END_MARKER);

        free(buffer);
        free(out_str);
        cJSON_Delete(json);
        cJSON_Delete(output);
    }
    return 0;
}

#include "cJSON.c"
#include "__sandbox_dispatcher.c"
