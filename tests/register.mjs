// node:test에서 "@/..." 경로 alias와 확장자 없는 TS import를 해석하기 위한 로더 훅.
// Node 24의 기본 타입 스트리핑으로 .ts 소스를 그대로 실행한다.
import { statSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fileIfExists(candidate) {
  try {
    return statSync(candidate).isFile() ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function resolveWithExtensions(basePath) {
  return (
    fileIfExists(basePath) ??
    fileIfExists(`${basePath}.ts`) ??
    fileIfExists(`${basePath}.tsx`) ??
    fileIfExists(path.join(basePath, "index.ts")) ??
    fileIfExists(path.join(basePath, "index.tsx"))
  );
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const resolved = resolveWithExtensions(path.resolve(projectRoot, specifier.slice(2)));
      if (resolved) {
        return nextResolve(pathToFileURL(resolved).href, context);
      }
    }

    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {
        const parentDir = path.dirname(fileURLToPath(context.parentURL));
        const resolved = resolveWithExtensions(path.resolve(parentDir, specifier));
        if (resolved) {
          return nextResolve(pathToFileURL(resolved).href, context);
        }
      }
      throw error;
    }
  }
});
