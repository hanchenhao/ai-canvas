import * as fs from "fs";
import * as path from "path";

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
});
