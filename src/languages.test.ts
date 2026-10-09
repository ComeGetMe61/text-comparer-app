import { describe, expect, it } from "vitest";
import { detectLanguage, resolveLanguage } from "./languages";

describe("local language detection", () => {
  it.each([
    ["hello.cs", "csharp"],
    ["app.JSX", "javascript"],
    ["app.tsx", "typescript"],
    ["README.md", "markdown"],
    ["data.json", "json"],
    ["config.yaml", "yaml"],
    ["styles.css", "css"],
    ["script.sh", "shell"],
    ["text.txt", "plaintext"],
  ])("uses recognized extension %s", (filename, expected) => {
    expect(detectLanguage("ambiguous content", filename)).toBe(expected);
  });
  it("detects pasted JSON, HTML, JavaScript, TypeScript and Python", () => {
    expect(detectLanguage('{"name":"Grüße","enabled":true}')).toBe("json");
    expect(
      detectLanguage("<!doctype html><html><body>Hello</body></html>"),
    ).toBe("html");
    expect(
      detectLanguage(
        'function greet(name) {\n  const message = "Hello " + name;\n  console.log(message);\n  return message;\n}',
      ),
    ).toBe("javascript");
    expect(
      detectLanguage(
        "interface User { name: string; age: number; }\nfunction greet(user: User): string { return user.name; }",
      ),
    ).toBe("typescript");
    expect(
      detectLanguage(
        'def greet(name):\n    print("Hello", name)\n    return True\n\nif __name__ == "__main__":\n    greet("World")',
      ),
    ).toBe("python");
    expect(
      detectLanguage(
        'using System;\nnamespace Example { public class Program { public static void Main() { Console.WriteLine("Hello"); } } }',
      ),
    ).toBe("csharp");
  });
  it("falls back for empty and ambiguous prose", () => {
    expect(detectLanguage("")).toBe("plaintext");
    expect(detectLanguage("These are some ordinary words in a sentence.")).toBe(
      "plaintext",
    );
    expect(detectLanguage("hello world")).toBe("plaintext");
  });
  it("manual choice overrides filename and content", () => {
    expect(resolveLanguage("csharp", '{"value":true}', "data.json")).toBe(
      "csharp",
    );
    expect(resolveLanguage("plaintext", "function run() {}", "app.js")).toBe(
      "plaintext",
    );
  });
});
