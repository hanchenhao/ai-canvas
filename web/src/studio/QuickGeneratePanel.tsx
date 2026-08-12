/** @jsxImportSource @emotion/react */
import { memo, useState, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import ImageIcon from "@mui/icons-material/Image";
import VideoIcon from "@mui/icons-material/VideoLibrary";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  FlexRow,
  FlexColumn,
  Text,
  Caption,
  Surface,
  TextInput,
  EditorButton,
  Chip,
  Tabs,
  Tab,
  Card,
  Box,
  SPACING,
  BORDER_RADIUS
} from "../components/ui_primitives";
import { useQuickGenerate } from "../hooks/useQuickGenerate";
import { useQuickGenerateStore } from "../stores/quickGenerate/QuickGenerateStore";

type Mode = "image" | "video";

const ResultCard = memo(function ResultCard({ job }: { job: ReturnType<typeof useQuickGenerateStore.getState>["jobs"][number] }) {
  const theme = useTheme();
  const isRunning = job.status === "queued" || job.status === "running";
  const uri = job.result?.uri;
  return (
    <Card variant="outlined" padding="none" sx={{ flex: "1 1 200px", maxWidth: 280, overflow: "hidden", borderRadius: BORDER_RADIUS.lg, border: `1px solid ${theme.vars.palette.divider}` }}>
      <FlexColumn sx={{ minHeight: 200 }}>
        {isRunning && (
          <FlexColumn align="center" justify="center" gap={2} sx={{ height: 200, opacity: 0.5 }}>
            <Text size="smaller" color="secondary">
              {job.status === "queued" ? "排队中…" : `生成中… ${Math.round(job.progress)}%`}
            </Text>
          </FlexColumn>
        )}
        {!isRunning && uri && (
          <Box component={job.kind === "image" ? "img" : "video"} src={uri} controls={job.kind === "video"} sx={{ width: "100%", height: 200, objectFit: "cover" }} />
        )}
        {job.status === "failed" && (
          <FlexColumn align="center" justify="center" gap={1} sx={{ height: 200 }}>
            <CancelIcon sx={{ color: theme.vars.palette.error.main }} />
            <Caption color="error" sx={{ maxWidth: 200, textAlign: "center" }}>{job.error}</Caption>
          </FlexColumn>
        )}
        <FlexRow align="center" justify="space-between" gap={2} sx={{ p: 2 }}>
          <Text size="smaller" truncate sx={{ maxWidth: 160 }}>{job.prompt}</Text>
          {job.status === "completed" && (
            <Chip icon={<CheckCircleIcon />} label={job.kind} size="small" color="success" variant="outlined" />
          )}
        </FlexRow>
      </FlexColumn>
    </Card>
  );
});

const QuickGeneratePanel = memo(function QuickGeneratePanel() {
  const theme = useTheme();
  const [mode, setMode] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { generateImage, generateVideo } = useQuickGenerate();
  const jobs = useQuickGenerateStore((s) => s.jobs);

  const handleGenerate = useCallback(async () => {
    const p = prompt.trim();
    if (!p) { setError("请输入提示词"); return; }
    setError(null);
    try {
      if (mode === 0) { await generateImage(p); } else { await generateVideo(p); }
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    }
  }, [prompt, mode, generateImage, generateVideo]);

  return (
    <FlexColumn gap={SPACING.lg} sx={{ width: "100%", maxWidth: 1120, mx: "auto" }}>
      <FlexRow align="flex-end" justify="space-between">
        <FlexColumn gap={SPACING.xs}>
          <Text size="big" weight={600}>快速生成</Text>
          <Text size="small" color="secondary">输入提示词直接出图或出视频，结果自动存入素材库。</Text>
        </FlexColumn>
      </FlexRow>
      <Surface elevation={2} rounded="large" padding={SPACING.lg}>
        <FlexColumn gap={SPACING.md}>
          <Tabs value={mode} onChange={(_, v) => setMode(v)}>
            <Tab icon={<ImageIcon />} label="生成图片" />
            <Tab icon={<VideoIcon />} label="生成视频" />
          </Tabs>
          <TextInput label="提示词" hideLabel multiline minRows={2} maxRows={4}
            value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={mode === 0 ? "描述你想要的图片…" : "描述你想要的视频…"}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); void handleGenerate(); } }}
          />
          {error && <Caption color="error">{error}</Caption>}
          <FlexRow justify="flex-end">
            <EditorButton size="medium" variant="contained" startIcon={<AutoAwesomeIcon />} onClick={() => void handleGenerate()}>
              生成{mode === 0 ? "图片" : "视频"}
            </EditorButton>
          </FlexRow>
        </FlexColumn>
      </Surface>
      {jobs.length > 0 && (
        <FlexRow gap={SPACING.md} wrap fullWidth>
          {jobs.map((job) => (<ResultCard key={job.id} job={job} />))}
        </FlexRow>
      )}
    </FlexColumn>
  );
});

export default QuickGeneratePanel;
