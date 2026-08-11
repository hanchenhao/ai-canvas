/** @jsxImportSource @emotion/react */
/**
 * Creator home for the self-hosted product. It offers one obvious prompt-first
 * path, direct access to the infinite canvas, and recent work. NodeTool's
 * workflow editor remains the advanced surface behind the canvas entry.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import TheatersRoundedIcon from "@mui/icons-material/TheatersRounded";
import RecordVoiceOverRoundedIcon from "@mui/icons-material/RecordVoiceOverRounded";
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import VideoLibraryRoundedIcon from "@mui/icons-material/VideoLibraryRounded";
import {
  AlertBanner,
  Card,
  Chip,
  EditorButton,
  FlexColumn,
  FlexRow,
  SPACING,
  Surface,
  Text,
  TextInput
} from "../components/ui_primitives";
import {
  useCreateStoryboard,
  useStoryboards
} from "../hooks/storyboard/useStoryboards";
import { useCreateScript, useScripts } from "../hooks/script/useScripts";
import { useTimelines } from "../hooks/useTimelineSequence";
import { useWorkflowManager } from "../contexts/WorkflowManagerContext";
import StudioShell from "./StudioShell";
import {
  STUDIO_CLIP_MODEL,
  STUDIO_DIRECTOR_MODEL,
  STUDIO_STILL_MODEL
} from "./curatedModels";

type ProjectKind = "storyboard" | "script" | "timeline";

interface RecentProject {
  kind: ProjectKind;
  id: string;
  name: string;
  updatedAt: string;
}

const KIND_LABEL: Record<ProjectKind, string> = {
  storyboard: "Storyboard",
  script: "Script",
  timeline: "Video"
};

const KIND_ICON: Record<ProjectKind, React.ReactNode> = {
  storyboard: <TheatersRoundedIcon fontSize="small" />,
  script: <RecordVoiceOverRoundedIcon fontSize="small" />,
  timeline: <MovieRoundedIcon fontSize="small" />
};

const projectRoute = (p: RecentProject) => `/studio/${p.kind}/${p.id}`;

interface PathCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  busy: boolean;
  disabled: boolean;
  onStart: () => void;
}

const PathCard = ({
  icon,
  title,
  description,
  cta,
  busy,
  disabled,
  onStart
}: PathCardProps) => (
  <Card
    variant="outlined"
    padding="comfortable"
    hoverable
    sx={{ flex: 1, minWidth: 260 }}
  >
    <FlexColumn gap={SPACING.lg} align="flex-start" fullHeight>
      <FlexRow align="center" gap={SPACING.md}>
        {icon}
        <Text size="big" weight={600}>
          {title}
        </Text>
      </FlexRow>
      <Text size="small" color="secondary" sx={{ flex: 1 }}>
        {description}
      </Text>
      <EditorButton
        variant="text"
        endIcon={<ArrowForwardRoundedIcon fontSize="small" />}
        onClick={onStart}
        disabled={disabled}
      >
        {busy ? "正在创建…" : cta}
      </EditorButton>
    </FlexColumn>
  </Card>
);

const projectName = (prompt: string): string => {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  if (!normalized) return "未命名故事板";
  return normalized.length > 24 ? `${normalized.slice(0, 24)}…` : normalized;
};

const StudioHome = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const createStoryboard = useCreateStoryboard();
  const createScript = useCreateScript();
  const createWorkflow = useWorkflowManager((state) => state.createNew);
  const [creating, setCreating] = useState<ProjectKind | "canvas" | null>(null);
  const [prompt, setPrompt] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const storyboards = useStoryboards();
  const scripts = useScripts();
  // No project filter: storyboards and scripts list all the user's documents,
  // so the merged recent list scopes timelines the same way.
  const timelines = useTimelines();

  const recent = useMemo<RecentProject[]>(() => {
    const rows: RecentProject[] = [
      ...(storyboards.data ?? []).map((s) => ({
        kind: "storyboard" as const,
        id: s.id,
        name: s.name,
        updatedAt: s.updatedAt
      })),
      ...(scripts.data ?? []).map((s) => ({
        kind: "script" as const,
        id: s.id,
        name: s.name,
        updatedAt: s.updatedAt
      })),
      ...(timelines.data ?? []).map((t) => ({
        kind: "timeline" as const,
        id: t.id,
        name: t.name,
        updatedAt: t.updatedAt
      }))
    ];
    return rows
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 12);
  }, [storyboards.data, scripts.data, timelines.data]);

  // One creation at a time: both cards disable while either runs, and the
  // handlers guard on a ref as well so a double-activation can't create two
  // projects or race the navigation.
  const creatingRef = useRef(false);
  const startStoryboard = useCallback(
    (brief = "") => {
      if (creatingRef.current) return;
      creatingRef.current = true;
      setCreateError(null);
      setCreating("storyboard");
      createStoryboard
        .mutateAsync({
          name: projectName(brief),
          projectId: "default",
          document: {
            screenplay: null,
            shots: [],
            brief: brief.trim(),
            style: "",
            entityIds: [],
            aspectRatio: "16:9",
            directorModel: STUDIO_DIRECTOR_MODEL,
            imageModel: STUDIO_STILL_MODEL,
            videoModel: STUDIO_CLIP_MODEL
          }
        })
        .then((created) => navigate(`/studio/storyboard/${created.id}`))
        .catch(() => setCreateError("创建失败，请检查服务和模型配置后重试。"))
        .finally(() => {
          creatingRef.current = false;
          setCreating(null);
        });
    },
    [createStoryboard, navigate]
  );

  const handlePromptStart = useCallback(() => {
    if (!prompt.trim()) {
      setCreateError("先写一句你想创作的内容。");
      return;
    }
    startStoryboard(prompt);
  }, [prompt, startStoryboard]);

  const startCanvas = useCallback(() => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreateError(null);
    setCreating("canvas");
    createWorkflow()
      .then((workflow) => navigate(`/editor/${workflow.id}`))
      .catch(() => setCreateError("无法创建画布，请稍后重试。"))
      .finally(() => {
        creatingRef.current = false;
        setCreating(null);
      });
  }, [createWorkflow, navigate]);

  const startScript = useCallback(() => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreateError(null);
    setCreating("script");
    createScript
      .mutateAsync({ name: "未命名脚本", projectId: "default" })
      .then((created) => navigate(`/studio/script/${created.id}`))
      .catch(() => setCreateError("创建脚本失败，请稍后重试。"))
      .finally(() => {
        creatingRef.current = false;
        setCreating(null);
      });
  }, [createScript, navigate]);

  return (
    <StudioShell showBack={false}>
      <FlexColumn
        gap={SPACING.xxxl}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          px: { xs: SPACING.xl, md: SPACING.xxxl },
          py: SPACING.xxxl,
          background: `radial-gradient(circle at 50% 0%, color-mix(in srgb, ${theme.vars.palette.primary.main} 12%, transparent), transparent 42%)`
        }}
      >
        <FlexColumn
          align="center"
          gap={SPACING.lg}
          sx={{ width: "100%", maxWidth: 960, mx: "auto", pt: SPACING.xl }}
        >
          <Chip
            compact
            color="primary"
            icon={<AutoAwesomeRoundedIcon />}
            label="AI 图片与视频创作工作台"
          />
          <Text size="giant" weight={600}>
            把一个想法，铺成完整作品
          </Text>
          <Text size="normal" color="secondary" align="center">
            从一句描述开始生成分镜、图片和视频，也可以进入无限画布自由连接模型与素材。
          </Text>
          <Surface
            elevation={2}
            rounded="large"
            padding={SPACING.xl}
            sx={{ width: "100%", mt: SPACING.md }}
          >
            <FlexColumn gap={SPACING.md}>
              <TextInput
                label="创意描述"
                hideLabel
                multiline
                minRows={3}
                maxRows={6}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="例如：一只橘猫在雨夜的香港街头寻找回家的路，电影感，霓虹灯倒影……"
                onKeyDown={(event) => {
                  if (
                    (event.metaKey || event.ctrlKey) &&
                    event.key === "Enter"
                  ) {
                    event.preventDefault();
                    handlePromptStart();
                  }
                }}
              />
              <FlexRow
                align="center"
                justify="space-between"
                wrap
                gap={SPACING.md}
              >
                <Text size="smaller" color="secondary">
                  支持 ⌘/Ctrl + Enter 快速开始
                </Text>
                <FlexRow gap={SPACING.md} wrap>
                  <EditorButton
                    size="large"
                    variant="outlined"
                    startIcon={<AccountTreeRoundedIcon />}
                    onClick={startCanvas}
                    disabled={creating !== null}
                  >
                    {creating === "canvas" ? "正在创建…" : "打开无限画布"}
                  </EditorButton>
                  <EditorButton
                    size="large"
                    variant="contained"
                    startIcon={<AutoAwesomeRoundedIcon />}
                    onClick={handlePromptStart}
                    disabled={creating !== null}
                  >
                    {creating === "storyboard" ? "正在创建…" : "开始创作"}
                  </EditorButton>
                </FlexRow>
              </FlexRow>
            </FlexColumn>
          </Surface>
          {createError && (
            <AlertBanner severity="error" title="操作未完成">
              {createError}
            </AlertBanner>
          )}
        </FlexColumn>

        <FlexColumn
          gap={SPACING.lg}
          sx={{ width: "100%", maxWidth: 1120, mx: "auto" }}
        >
          <FlexRow align="end" justify="space-between">
            <FlexColumn gap={SPACING.xs}>
              <Text size="big" weight={600}>
                选择创作方式
              </Text>
              <Text size="small" color="secondary">
                普通创作不需要理解节点；需要精细控制时再进入无限画布。
              </Text>
            </FlexColumn>
          </FlexRow>
          <FlexRow gap={SPACING.lg} wrap fullWidth>
            <PathCard
              icon={<ImageRoundedIcon color="primary" />}
              title="图片与素材画布"
              description="在无限画布中组织提示词、参考图和生成结果，适合海报、角色设定和多版本探索。"
              cta="新建无限画布"
              busy={creating === "canvas"}
              disabled={creating !== null}
              onStart={startCanvas}
            />
            <PathCard
              icon={<VideoLibraryRoundedIcon color="primary" />}
              title="分镜生成视频"
              description="先拆分镜，再生成关键帧和视频片段，最后进入时间线完成剪辑。"
              cta="新建故事板"
              busy={creating === "storyboard"}
              disabled={creating !== null}
              onStart={() => startStoryboard()}
            />
            <PathCard
              icon={<RecordVoiceOverRoundedIcon color="primary" />}
              title="脚本与口播视频"
              description="编写台词、分配声音并生成带字幕的视频，适合解说、课程和数字人口播。"
              cta="新建脚本"
              busy={creating === "script"}
              disabled={creating !== null}
              onStart={startScript}
            />
          </FlexRow>
        </FlexColumn>

        {recent.length > 0 && (
          <FlexColumn
            gap={SPACING.lg}
            sx={{ width: "100%", maxWidth: 1120, mx: "auto" }}
          >
            <Text size="big" weight={600}>
              最近项目
            </Text>
            <FlexRow gap={SPACING.lg} wrap fullWidth>
              {recent.map((p) => (
                <Card
                  key={`${p.kind}:${p.id}`}
                  variant="outlined"
                  padding="none"
                  clickable
                  hoverable
                  onClick={() => navigate(projectRoute(p))}
                  sx={{
                    flex: "1 1 240px",
                    maxWidth: 352,
                    textAlign: "left",
                    overflow: "hidden"
                  }}
                >
                  <FlexColumn
                    align="center"
                    justify="center"
                    sx={{
                      minHeight: 132,
                      color: theme.vars.palette.primary.main,
                      background: `linear-gradient(135deg, color-mix(in srgb, ${theme.vars.palette.primary.main} 16%, ${theme.vars.palette.background.paper}), ${theme.vars.palette.background.paper})`
                    }}
                  >
                    {KIND_ICON[p.kind]}
                  </FlexColumn>
                  <FlexColumn gap={SPACING.sm} sx={{ p: SPACING.lg }}>
                    <Text size="normal" weight={600} truncate>
                      {p.name}
                    </Text>
                    <FlexRow align="center" justify="space-between">
                      <Chip compact label={KIND_LABEL[p.kind]} />
                      <Text size="smaller" color="secondary">
                        {new Date(p.updatedAt).toLocaleDateString("zh-CN")}
                      </Text>
                    </FlexRow>
                  </FlexColumn>
                </Card>
              ))}
            </FlexRow>
          </FlexColumn>
        )}
      </FlexColumn>
    </StudioShell>
  );
};

export default StudioHome;
