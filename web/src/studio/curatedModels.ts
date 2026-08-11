/**
 * Model policy for the self-hosted creator experience.
 *
 * Studio deliberately exposes a short, product-level list. Advanced users can
 * still select any provider/model in the NodeTool workspace. API keys are read
 * by the backend secret store; no credential is included in this frontend
 * module or in VITE_* variables.
 */

import type {
  ImageModelValue,
  LanguageModelValue,
  TTSModelValue,
  VideoModelValue
} from "../stores/ApiTypes";

export interface CuratedOption<T> {
  id: string;
  value: T;
  label: string;
  blurb: string;
  tasks: string[];
}

const imageModel = (
  id: string,
  name: string,
  provider = "minimax"
): ImageModelValue => ({
  type: "image_model",
  id,
  provider,
  name,
  path: ""
});

const videoModel = (
  id: string,
  name: string,
  provider: string
): VideoModelValue => ({
  type: "video_model",
  id,
  provider,
  name
});

/** MiniMax M2 directs storyboards using the same encrypted MiniMax API key. */
export const STUDIO_DIRECTOR_MODEL: LanguageModelValue = {
  type: "language_model",
  id: "MiniMax-M2.5",
  provider: "minimax",
  name: "MiniMax M2.5"
};

/** MiniMax Image-01 is the default image generator requested for this fork. */
export const STUDIO_STILL_MODELS: CuratedOption<ImageModelValue>[] = [
  {
    id: "image-01",
    value: imageModel("image-01", "MiniMax Image-01"),
    label: "MiniMax Image-01",
    blurb: "支持文生图与主体参考图，适合分镜关键帧和视觉探索。",
    tasks: ["text_to_image", "image_to_image"]
  }
];

/**
 * Seedance is available through NodeTool's mature KIE adapter today. The
 * provider/model can be changed at build time without exposing its API key.
 */
const configuredVideoProvider =
  import.meta.env.VITE_STUDIO_VIDEO_PROVIDER?.trim() || "kie";
const configuredVideoModel =
  import.meta.env.VITE_STUDIO_VIDEO_MODEL?.trim() || "bytedance/seedance-2";
const configuredVideoName =
  import.meta.env.VITE_STUDIO_VIDEO_MODEL_NAME?.trim() || "Seedance 2.0";

export const STUDIO_CLIP_MODELS: CuratedOption<VideoModelValue>[] = [
  {
    id: configuredVideoModel,
    value: videoModel(
      configuredVideoModel,
      configuredVideoName,
      configuredVideoProvider
    ),
    label: configuredVideoName,
    blurb: "支持文生视频、首帧/尾帧和参考素材。默认通过 KIE 适配器调用。",
    tasks: ["text_to_video", "image_to_video"]
  },
  ...(configuredVideoProvider === "kie" &&
  configuredVideoModel !== "bytedance/seedance-2-fast"
    ? [
        {
          id: "bytedance/seedance-2-fast",
          value: videoModel(
            "bytedance/seedance-2-fast",
            "Seedance 2.0 Fast",
            "kie"
          ),
          label: "Seedance 2.0 Fast",
          blurb: "更快的预览版本，适合快速迭代镜头。",
          tasks: ["text_to_video", "image_to_video"]
        }
      ]
    : [])
];

export const STUDIO_VOICES: CuratedOption<TTSModelValue>[] = [
  {
    id: "Chinese (Mandarin)_Warm_Bestie",
    value: {
      type: "tts_model",
      id: "speech-2.8-turbo",
      provider: "minimax",
      name: "MiniMax Speech 2.8 Turbo",
      voices: [
        "Chinese (Mandarin)_Warm_Bestie",
        "Chinese (Mandarin)_Gentleman",
        "Chinese (Mandarin)_Male_Announcer"
      ],
      selected_voice: "Chinese (Mandarin)_Warm_Bestie"
    },
    label: "温暖女声",
    blurb: "自然、亲切，适合故事和生活类口播。",
    tasks: ["text_to_speech"]
  }
];

/** The curated options that can do at least one requested task. */
export const forTasks = <T>(
  list: CuratedOption<T>[],
  task?: string | string[]
): CuratedOption<T>[] => {
  const wanted = task ? (Array.isArray(task) ? task : [task]) : [];
  if (wanted.length === 0) return list;
  return list.filter((option) =>
    wanted.some((item) => option.tasks.includes(item))
  );
};

export const STUDIO_STILL_MODEL: ImageModelValue = STUDIO_STILL_MODELS[0].value;
export const STUDIO_CLIP_MODEL: VideoModelValue = STUDIO_CLIP_MODELS[0].value;
export const STUDIO_VOICE: TTSModelValue = STUDIO_VOICES[0].value;
