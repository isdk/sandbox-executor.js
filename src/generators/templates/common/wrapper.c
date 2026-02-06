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
        printf("%s\n{\"success\": false, \"error\": {\"message\": \"Failed to parse inline JSON\", \"type\": \"ParseError\"}} \n%s\n", START_MARKER, END_MARKER);
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
