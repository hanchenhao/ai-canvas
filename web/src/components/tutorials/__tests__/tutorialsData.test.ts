import { renderHook } from "@testing-library/react";
import { useTutorials, useTutorial } from "../tutorialsData";
import type { Tutorial } from "../tutorialsData";

describe("tutorialsData", () => {
  describe("useTutorials", () => {
    it("returns a non-empty array", () => {
      const { result } = renderHook(() => useTutorials());
      expect(result.current.length).toBeGreaterThan(0);
    });

    it("every entry has all required fields", () => {
      const { result } = renderHook(() => useTutorials());
      const requiredKeys: (keyof Tutorial)[] = [
        "id",
        "title",
        "tagline",
        "description",
        "level",
        "durationLabel",
        "video",
        "poster",
        "accent",
        "learn"
      ];
      for (const tutorial of result.current) {
        for (const key of requiredKeys) {
          expect(tutorial).toHaveProperty(key);
        }
      }
    });

    it("every id is unique", () => {
      const { result } = renderHook(() => useTutorials());
      const ids = result.current.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("every learn array is non-empty", () => {
      const { result } = renderHook(() => useTutorials());
      for (const tutorial of result.current) {
        expect(tutorial.learn.length).toBeGreaterThan(0);
      }
    });

    it("every video path starts with /tutorials/", () => {
      const { result } = renderHook(() => useTutorials());
      for (const tutorial of result.current) {
        expect(tutorial.video).toMatch(/^\/tutorials\//);
      }
    });

    it("every poster path starts with /tutorials/", () => {
      const { result } = renderHook(() => useTutorials());
      for (const tutorial of result.current) {
        expect(tutorial.poster).toMatch(/^\/tutorials\//);
      }
    });

    it("every accent is a valid hex color", () => {
      const { result } = renderHook(() => useTutorials());
      for (const tutorial of result.current) {
        expect(tutorial.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it("every durationLabel matches M:SS format", () => {
      const { result } = renderHook(() => useTutorials());
      for (const tutorial of result.current) {
        expect(tutorial.durationLabel).toMatch(/^\d+:\d{2}$/);
      }
    });
  });

  describe("useTutorial", () => {
    it("returns the matching tutorial by id", () => {
      const { result: list } = renderHook(() => useTutorials());
      const first = list.current[0];
      const { result } = renderHook(() => useTutorial(first.id));
      expect(result.current.id).toBe(first.id);
    });

    it("returns the last tutorial when it exists", () => {
      const { result: list } = renderHook(() => useTutorials());
      const last = list.current[list.current.length - 1];
      const { result } = renderHook(() => useTutorial(last.id));
      expect(result.current.id).toBe(last.id);
    });

    it("falls back to the first tutorial for an unknown id", () => {
      const { result: list } = renderHook(() => useTutorials());
      const { result } = renderHook(() => useTutorial("nonexistent-tutorial-id"));
      expect(result.current.id).toBe(list.current[0].id);
    });

    it("falls back to the first tutorial when id is null", () => {
      const { result: list } = renderHook(() => useTutorials());
      const { result } = renderHook(() => useTutorial(null));
      expect(result.current.id).toBe(list.current[0].id);
    });

    it("falls back to the first tutorial when id is undefined", () => {
      const { result: list } = renderHook(() => useTutorials());
      const { result } = renderHook(() => useTutorial(undefined));
      expect(result.current.id).toBe(list.current[0].id);
    });
  });
});
