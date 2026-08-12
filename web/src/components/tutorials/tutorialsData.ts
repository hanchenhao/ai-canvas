/**
 * Beginner tutorials shown on the Tutorials page, the dashboard section, and the
 * logo menu. Each entry points at a pre-rendered MP4 + poster shipped under
 * `web/public/tutorials/` (produced by the Remotion harness in `demo/`), so the
 * app plays them with a plain <video> — no Remotion bundled into the build.
 *
 * Structural data only — all user-visible text (title, tagline, description,
 * learn items) lives in `web/src/locales/{en,zh-CN}/tutorials.json` and is
 * merged in by `useTutorials()`.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface Tutorial {
  /** Stable id, used in the `/tutorials?id=` query param and as i18n key. */
  id: string;
  title: string;
  /** One-line hook shown under the title. */
  tagline: string;
  /** A sentence or two describing what the tutorial covers. */
  description: string;
  /** Translated difficulty label, e.g. "Beginner". */
  level: string;
  /** Human-readable runtime, e.g. "0:23". */
  durationLabel: string;
  /** Public path to the rendered video. */
  video: string;
  /** Public path to the poster still. */
  poster: string;
  /** Accent colour (hex) used for the card and play button. */
  accent: string;
  /** Bullet points: what the viewer will learn. */
  learn: string[];
}

interface TutorialStruct {
  id: string;
  /** Level code, maps to tutorials:level.<code>. */
  level: string;
  durationLabel: string;
  video: string;
  poster: string;
  accent: string;
  /** Number of learn-item entries in the locale file. */
  learnCount: number;
}

const TUTORIAL_STRUCTS: readonly TutorialStruct[] = [
  {
    id: "first-workflow",
    level: "beginner",
    durationLabel: "0:23",
    video: "/tutorials/first-workflow.mp4",
    poster: "/tutorials/first-workflow.jpg",
    accent: "#f59e0b",
    learnCount: 3
  },
  {
    id: "connect-run",
    level: "beginner",
    durationLabel: "0:11",
    video: "/tutorials/connect-run.mp4",
    poster: "/tutorials/connect-run.jpg",
    accent: "#22c55e",
    learnCount: 3
  },
  {
    id: "list-generator",
    level: "beginner",
    durationLabel: "0:17",
    video: "/tutorials/list-generator.mp4",
    poster: "/tutorials/list-generator.jpg",
    accent: "#8b5cf6",
    learnCount: 3
  },
  {
    id: "ask-ai",
    level: "beginner",
    durationLabel: "0:16",
    video: "/tutorials/ask-ai.mp4",
    poster: "/tutorials/ask-ai.jpg",
    accent: "#06b6d4",
    learnCount: 3
  },
  {
    id: "combine-inputs",
    level: "beginner",
    durationLabel: "0:12",
    video: "/tutorials/combine-inputs.mp4",
    poster: "/tutorials/combine-inputs.jpg",
    accent: "#ec4899",
    learnCount: 3
  },
  {
    id: "summarize-text",
    level: "beginner",
    durationLabel: "0:16",
    video: "/tutorials/summarize-text.mp4",
    poster: "/tutorials/summarize-text.jpg",
    accent: "#14b8a6",
    learnCount: 3
  },
  {
    id: "describe-image",
    level: "beginner",
    durationLabel: "0:17",
    video: "/tutorials/describe-image.mp4",
    poster: "/tutorials/describe-image.jpg",
    accent: "#f97316",
    learnCount: 3
  },
  {
    id: "chat-agent-qa",
    level: "beginner",
    durationLabel: "0:17",
    video: "/tutorials/chat-agent-qa.mp4",
    poster: "/tutorials/chat-agent-qa.jpg",
    accent: "#06b6d4",
    learnCount: 3
  },
  {
    id: "timeline-trim-arrange",
    level: "beginner",
    durationLabel: "0:23",
    video: "/tutorials/timeline-trim-arrange.mp4",
    poster: "/tutorials/timeline-trim-arrange.jpg",
    accent: "#8b5cf6",
    learnCount: 3
  }
];

/**
 * Build a fully-translated Tutorial list from the structural data + current
 * language's locale file. Call inside a component so it re-renders on language
 * change.
 */
export function useTutorials(): Tutorial[] {
  const { t } = useTranslation(["tutorials"]);
  return useMemo(
    () =>
      TUTORIAL_STRUCTS.map((struct) => {
        const baseKey = `tutorials:tutorial.${struct.id}`;
        const learn: string[] = [];
        for (let i = 0; i < struct.learnCount; i++) {
          learn.push(t(`${baseKey}.learn.${i}`));
        }
        return {
          id: struct.id,
          title: t(`${baseKey}.title`),
          tagline: t(`${baseKey}.tagline`),
          description: t(`${baseKey}.description`),
          level: t(`tutorials:level.${struct.level}`),
          durationLabel: struct.durationLabel,
          video: struct.video,
          poster: struct.poster,
          accent: struct.accent,
          learn
        };
      }),
    [t]
  );
}

/** Translated lookup by id (falls back to first tutorial). */
export function useTutorial(id: string | null | undefined): Tutorial {
  const tutorials = useTutorials();
  return useMemo(
    () => tutorials.find((tut) => tut.id === id) ?? tutorials[0],
    [tutorials, id]
  );
}
