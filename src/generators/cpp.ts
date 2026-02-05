// src/generators/cpp.ts

import { CodeGenerator, RESULT_MARKERS } from './base';
import type { InferredSignature } from '../inference/engine';

export class CppGenerator extends CodeGenerator {
  readonly language = 'clangpp';
  readonly fileExtension = '.cpp';

  protected generateWrapper(
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature
  ): string {
    const argsCode = args.map(a => this.serialize(a)).join(', ');

    return `
#include <iostream>
#include <string>
#include <type_traits>

// === Sandbox Executor Wrapper ===
namespace __sandbox__ {
    template<typename T, typename Enable = void>
    struct printer {
        static void print(const T& val) { std::cout << "null"; }
    };

    template<typename T>
    struct printer<T, typename std::enable_if<std::is_same<T, bool>::value>::type> {
        static void print(T val) { std::cout << (val ? "true" : "false"); }
    };

    template<typename T>
    struct printer<T, typename std::enable_if<std::is_arithmetic<T>::value && !std::is_same<T, bool>::value>::type> {
        static void print(T val) { std::cout << val; }
    };

    template<typename T>
    struct printer<T, typename std::enable_if<std::is_convertible<T, std::string>::value && !std::is_arithmetic<T>::value>::type> {
        static void print(const T& val) { std::cout << "\\"" << val << "\\""; }
    };

    template<typename T>
    void print_value(const T& val) {
        printer<T>::print(val);
    }

    void print_value(void*) {
        std::cout << "null";
    }

    template<typename T>
    struct result_handler {
        static void execute() {
            auto __result__ = ${functionName}(${argsCode});
            std::cout << "{\\"success\\": true, \\"result\\": ";
            print_value(__result__);
            std::cout << "}";
        }
    };

    template<>
    struct result_handler<void> {
        static void execute() {
            ${functionName}(${argsCode});
            std::cout << "{\\"success\\": true, \\"result\\": null}";
        }
    };
}

int main() {
    std::cout << "${RESULT_MARKERS.START}" << std::endl;
    __sandbox__::result_handler<decltype(${functionName}(${argsCode}))>::execute();
    std::cout << std::endl << "${RESULT_MARKERS.END}" << std::endl;
    return 0;
}
`;
  }

  protected serialize(value: unknown): string {
    if (value === null || value === undefined) return 'nullptr';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') return String(value);
    // Arrays and objects are hard in C++ without a library like nlohmann/json
    return '0';
  }
}