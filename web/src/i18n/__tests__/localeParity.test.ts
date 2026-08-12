import * as fs from "fs";
import * as path from "path";
import allowlist from "./identical-allowlist.json";

const enDir = path.join(__dirname, "../../locales/en");
const zhDir = path.join(__dirname, "../../locales/zh-CN");

type JsonObject = Record<string, unknown>;

function flattenKeys(obj: JsonObject, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null
      ? flattenKeys(v as JsonObject, key)
      : [key];
  });
}

function flattenValues(obj: JsonObject, prefix = ""): Record<string, unknown> {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null
      ? { ...acc, ...flattenValues(v as JsonObject, key) }
      : { ...acc, [key]: v };
  }, {} as Record<string, unknown>);
}

function loadJson(dir: string, file: string): JsonObject {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as JsonObject;
}

describe("locale parity (en vs zh-CN)", () => {
  const files = fs
    .readdirSync(enDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  test("both locales ship the same namespace files", () => {
    const zhFiles = fs
      .readdirSync(zhDir)
      .filter((f) => f.endsWith(".json"))
      .sort();
    expect(zhFiles).toEqual(files);
  });

  for (const file of files) {
    describe(file, () => {
      test("zh-CN has every key en has", () => {
        const enKeys = flattenKeys(loadJson(enDir, file));
        const zhKeys = new Set(flattenKeys(loadJson(zhDir, file)));
        expect(enKeys.filter((k) => !zhKeys.has(k))).toEqual([]);
      });

      test("zh-CN has no keys en lacks", () => {
        const enKeys = new Set(flattenKeys(loadJson(enDir, file)));
        const zhKeys = flattenKeys(loadJson(zhDir, file));
        expect(zhKeys.filter((k) => !enKeys.has(k))).toEqual([]);
      });
    });
  }

  test("zh-CN values differ from en unless allowlisted", () => {
    const allow = new Map(
      Object.entries(allowlist as Record<string, string[]>),
    );
    const violations: string[] = [];
    for (const file of files) {
      const ns = file.replace(".json", "");
      const allowed = new Set(allow.get(ns) ?? []);
      const en = flattenValues(loadJson(enDir, file));
      const zh = flattenValues(loadJson(zhDir, file));
      for (const [key, value] of Object.entries(en)) {
        if (
          typeof value === "string" &&
          /[a-zA-Z]{2,}/.test(value) &&
          zh[key] === value &&
          !allowed.has(key)
        ) {
          violations.push(`${ns}:${key}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
