#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "cJSON.h"

#define START_MARKER "__SANDBOX_RESULT_START__"
#define END_MARKER "__SANDBOX_RESULT_END__"

#ifndef SANDBOX_REQUEST_FILE
#define SANDBOX_REQUEST_FILE ".sandbox_request.json"
#endif

cJSON* __sandbox_dispatch(cJSON* params);

int main() {
    FILE *f = fopen(SANDBOX_REQUEST_FILE, "rb");
    if (f == NULL) {
        printf("%s\n{\"success\": false, \"error\": {\"message\": \"Failed to open request file\", \"type\": \"IOError\"}} \n%s\n", START_MARKER, END_MARKER);
        return 1;
    }
    fseek(f, 0, SEEK_END);
    long length = ftell(f);
    fseek(f, 0, SEEK_SET);
    char *buffer = (char *)malloc(length + 1);
    if (!buffer) return 1;
    fread(buffer, 1, length, f);
    fclose(f);
    buffer[length] = '\0';

    cJSON *json = cJSON_Parse(buffer);
    if (json == NULL) {
        printf("%s\n{\"success\": false, \"error\": {\"message\": \"Failed to parse request JSON\", \"type\": \"ParseError\"}} \n%s\n", START_MARKER, END_MARKER);
        free(buffer);
        return 1;
    }

    cJSON *output = __sandbox_dispatch(json);
    char *out_str = cJSON_PrintUnformatted(output);
    printf("%s\n%s\n%s\n", START_MARKER, out_str, END_MARKER);

    free(buffer);
    free(out_str);
    cJSON_Delete(json);
    cJSON_Delete(output);
    return 0;
}

#include "cJSON.c"
#include "__sandbox_dispatcher.c"