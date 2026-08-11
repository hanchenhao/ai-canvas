import { describe, it, expect } from "@jest/globals";
import { extractNodeStrings } from "../extractNodeStrings";
import type { NodeMetadata } from "../../stores/ApiTypes";

function makeMeta(over: Partial<NodeMetadata>): NodeMetadata {
  return {
    node_type: over.node_type ?? "test.X",
    title: over.title ?? "T",
    description: over.description ?? "D",
    namespace: over.namespace ?? "test",
    properties: over.properties ?? [],
    outputs: over.outputs ?? []
  } as NodeMetadata;
}

describe("extractNodeStrings", () => {
  it("returns empty catalog for empty input", () => {
    expect(extractNodeStrings([])).toEqual({});
  });

  it("extracts title and description", () => {
    const out = extractNodeStrings([
      makeMeta({ node_type: "ns.A", title: "Alpha", description: "First" })
    ]);
    expect(out["ns.A"]).toEqual({
      title: "Alpha",
      description: "First",
      properties: {}
    });
  });

  it("sorts nodes by node_type", () => {
    const out = extractNodeStrings([
      makeMeta({ node_type: "ns.Z" }),
      makeMeta({ node_type: "ns.A" }),
      makeMeta({ node_type: "ns.M" })
    ]);
    expect(Object.keys(out)).toEqual(["ns.A", "ns.M", "ns.Z"]);
  });

  it("sorts properties by name", () => {
    const out = extractNodeStrings([
      makeMeta({
        node_type: "ns.A",
        properties: [
          { name: "zeta", title: "Z", description: null },
          { name: "alpha", title: "A", description: null }
        ] as any
      })
    ]);
    expect(Object.keys(out["ns.A"].properties)).toEqual(["alpha", "zeta"]);
  });

  it("drops properties without a name", () => {
    const out = extractNodeStrings([
      makeMeta({
        node_type: "ns.A",
        properties: [
          { name: "keep", title: "K", description: null },
          { name: undefined, title: "Drop", description: null }
        ] as any
      })
    ]);
    expect(Object.keys(out["ns.A"].properties)).toEqual(["keep"]);
  });

  it("preserves title and description as undefined when source lacks them", () => {
    const out = extractNodeStrings([
      makeMeta({
        node_type: "ns.A",
        properties: [{ name: "p", title: null, description: null } as any]
      })
    ]);
    expect(out["ns.A"].properties.p).toEqual({ title: undefined, description: undefined });
  });

  it("is stable across multiple invocations (same input → same output reference shape)", () => {
    const input = [
      makeMeta({ node_type: "ns.B", title: "B", description: "d" }),
      makeMeta({ node_type: "ns.A", title: "A", description: "c" })
    ];
    const a = JSON.stringify(extractNodeStrings(input));
    const b = JSON.stringify(extractNodeStrings([...input].reverse()));
    // Reordering input must not change the sorted output.
    expect(a).toEqual(b);
  });

  it("snapshot: small synthetic catalog has stable shape", () => {
    const input: NodeMetadata[] = [
      makeMeta({
        node_type: "lib.text.Concat",
        title: "Concat",
        description: "Concatenate text",
        properties: [
          { name: "a", title: "A", description: "First" } as any,
          { name: "b", title: "B", description: "Second" } as any
        ]
      }),
      makeMeta({
        node_type: "lib.constant.Number",
        title: "Number",
        description: "A constant number",
        properties: [] as any
      })
    ];
    expect(extractNodeStrings(input)).toEqual({
      "lib.text.Concat": {
        title: "Concat",
        description: "Concatenate text",
        properties: {
          a: { title: "A", description: "First" },
          b: { title: "B", description: "Second" }
        }
      },
      "lib.constant.Number": {
        title: "Number",
        description: "A constant number",
        properties: {}
      }
    });
  });
});
