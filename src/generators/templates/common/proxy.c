#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "cJSON.h"

#define START_MARKER "__SANDBOX_RESULT_START__"
#define END_MARKER "__SANDBOX_RESULT_END__"

cJSON* __sandbox_dispatch(cJSON* params);

int main() {
    unsigned char header[5];
    for (int i = 0; i < 5; i++) {
        int c = getchar();
        if (c == EOF) return 0;
        header[i] = (unsigned char)c;
    }

    char mode = (char)header[0];
    unsigned int length = (header[1] << 24) | (header[2] << 16) | (header[3] << 8) | header[4];

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
            printf("%s\n{\"success\": false, \"error\": {\"message\": \"Failed to parse stdin JSON\", \"type\": \"ParseError\"}} \n%s\n", START_MARKER, END_MARKER);
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
