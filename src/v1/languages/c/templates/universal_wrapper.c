#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "cJSON.h"

#define START_MARKER "__SANDBOX_RESULT_START__"
#define END_MARKER "__SANDBOX_RESULT_END__"

cJSON* __sandbox_dispatch(cJSON* params);

void send_result(cJSON *result_msg) {
    char *out_str = cJSON_PrintUnformatted(result_msg);
    const char *result_fd_env = getenv("SB_RESULT_FD");
    
    if (result_fd_env != NULL) {
        int fd = atoi(result_fd_env);
        // In some WASM environments, fdopen might not be available or behaves differently
        // but we keep it for native/future compatibility
        FILE *fp = fdopen(fd, "w");
        if (fp != NULL) {
            fprintf(fp, "%s\n", out_str);
            fclose(fp);
            free(out_str);
            return;
        }
    }
    
    // Default to stdout with markers
    printf("%s%s%s\n", START_MARKER, out_str, END_MARKER);
    free(out_str);
}

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

        cJSON *call_msg = cJSON_Parse(buffer);
        if (call_msg == NULL) {
            cJSON *res = cJSON_CreateObject();
            cJSON_AddStringToObject(res, "ver", "1.0");
            cJSON_AddStringToObject(res, "type", "result");
            cJSON_AddStringToObject(res, "status", "fail");
            cJSON *data = cJSON_AddObjectToObject(res, "data");
            cJSON *error = cJSON_AddObjectToObject(data, "error");
            cJSON_AddStringToObject(error, "message", "Failed to parse call message");
            cJSON_AddStringToObject(error, "type", "ParseError");
            send_result(res);
            cJSON_Delete(res);
            free(buffer);
            return 0;
        }

        // Get call ID to reply with same ID
        cJSON *id_node = cJSON_GetObjectItem(call_msg, "id");
        const char *id_str = (id_node != NULL) ? id_node->valuestring : "unknown";

        cJSON *params_node = cJSON_GetObjectItem(call_msg, "params");

        cJSON *execution_data = __sandbox_dispatch(params_node);
        
        cJSON *res = cJSON_CreateObject();
        cJSON_AddStringToObject(res, "ver", "1.0");
        cJSON_AddStringToObject(res, "id", id_str);
        cJSON_AddStringToObject(res, "type", "result");
        cJSON_AddStringToObject(res, "status", "ok");
        cJSON_AddItemToObject(res, "data", execution_data);
        
        send_result(res);

        free(buffer);
        cJSON_Delete(call_msg);
        cJSON_Delete(res);
    }
    return 0;
}

#include "cJSON.c"
#include "__sandbox_dispatcher.c"
