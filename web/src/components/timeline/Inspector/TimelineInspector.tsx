/** @jsxImportSource @emotion/react */
import React, { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/react";
import { useTheme, type Theme } from "@mui/material/styles";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import PermMediaOutlinedIcon from "@mui/icons-material/PermMediaOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";

import { useTimelineUIStore } from "../../../stores/timeline/TimelineUIStore";
import { useTimelineStore } from "../../../stores/timeline/TimelineStore";
import { findClipById } from "../../../stores/timeline/clipLookup";
import { usePersistedFold } from "./usePersistedFold";
import {
  CollapsibleSection,
  EmptyState,
  FlexColumn,
  Panel,
  Text,
  SPACING,
  getSpacingPx,
  TextInput
} from "../../ui_primitives";
import { trackTypeAccent } from "../Tracks/trackVisuals";
import {
  ClipIdentityCard,
  InspectorDivider,
  InspectorHeader,
  InspectorPillInput,
  InspectorRow,
  InspectorSectionTitle,
  InspectorSelect,
  InspectorStaticValue,
  InspectorToggleRow
} from "./InspectorPrimitives";
import {
  formatTimecode,
  parseSeconds,
  parseTimecode
} from "./InspectorPrimitives.helpers";
import { ClipAdjustments } from "./ClipAdjustments";
import { ClipAnimations } from "./ClipAnimations";
import { GeneratedClipPanel } from "./GeneratedClipPanel";
import { DirectGenClipPanel } from "./DirectGenClipPanel";

// ── Styles ─────────────────────────────────────────────────────────────────

const containerStyles = css({
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
  padding: `${getSpacingPx(SPACING.md)} ${getSpacingPx(SPACING.lg)} ${getSpacingPx(SPACING.xxl)}`,
  overflow: "auto"
});

const sectionContentStyles = (theme: Theme) =>
  css({
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: theme.spacing(0.5, 0, 2)
  });

const inspectorPanelSx = {
  height: "100%",
  maxHeight: "100%",
  minHeight: 0,
  overflow: "auto",
  boxSizing: "border-box"
};

const TEXT_ALIGNMENTS = [
  { value: "left", labelKey: "timeline:inspector.alignLeft" },
  { value: "center", labelKey: "timeline:inspector.alignCenter" },
  { value: "right", labelKey: "timeline:inspector.alignRight" }
] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// ── Component ──────────────────────────────────────────────────────────────

export const TimelineInspector: React.FC = memo(() => {
  const theme = useTheme();
  const { t } = useTranslation(["timeline"]);
  const TEXT_ALIGN_LABELS = useMemo(
    () =>
      TEXT_ALIGNMENTS.map((a) => ({
        value: a.value,
        label: t(a.labelKey)
      })),
    [t]
  );

  const selectedClipIds = useTimelineUIStore((s) => s.selectedClipIds);
  const clipId = selectedClipIds.size === 1 ? [...selectedClipIds][0] : null;
  const selectedCount = selectedClipIds.size;

  // Persisted fold state — closed by default, remembered across selections
  // and reloads via localStorage.
  const [mediaOpen, setMediaOpen] = usePersistedFold("media");
  const [textOpen, setTextOpen] = usePersistedFold("text");
  const [timingOpen, setTimingOpen] = usePersistedFold("timing");

  const clip = useTimelineStore((s) =>
    clipId ? (findClipById(s.clips, clipId) ?? null) : null
  );
  const textStyle = clip?.mediaType === "text" ? clip.textStyle : undefined;
  const track = useTimelineStore((s) =>
    clip ? s.tracks.find((t) => t.id === clip.trackId) : null
  );
  const fps = useTimelineStore((s) => s.fps);
  const deleteSelected = useTimelineStore((s) => s.deleteSelected);
  const patchClip = useTimelineStore((s) => s.patchClip);

  const onPatchNumber = useCallback(
    (field: string, raw: string, min?: number, max?: number) => {
      if (!clipId) return;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      const value =
        min != null && max != null ? clamp(parsed, min, max) : parsed;
      patchClip(clipId, { [field]: value });
    },
    [clipId, patchClip]
  );

  // ── Identity metadata ───────────────────────────────────────────────────

  const accentColor = useMemo(
    () => (track ? trackTypeAccent(theme, track.type) : undefined),
    [track, theme]
  );

  const identityMeta = useMemo<string[]>(() => {
    if (!clip) return [];
    const parts: string[] = [clip.mediaType];
    const secs = clip.durationMs / 1000;
    parts.push(secs < 10 ? `${secs.toFixed(2)}s` : `${secs.toFixed(1)}s`);
    if (clip.width && clip.height) {
      parts.push(`${clip.width}×${clip.height}`);
    }
    return parts;
  }, [clip]);

  // ── Empty / multi-selection states ──────────────────────────────────────

 if (selectedCount === 0) {
   return (
      <Panel
        background="default"
        bordered={false}
        css={containerStyles}
        sx={inspectorPanelSx}
      >
        <InspectorHeader eyebrow={t("timeline:inspector.inspector")} />
        <EmptyState
          variant="empty"
          size="small"
          title={t("timeline:inspector.noSelection")}
          description={t("timeline:inspector.noSelectionHint")}
        />
      </Panel>
    );
  }

 if (selectedCount > 1) {
   return (
      <Panel
        background="default"
        bordered={false}
        css={containerStyles}
        sx={inspectorPanelSx}
      >
        <InspectorHeader
          eyebrow={t("timeline:inspector.clipsSelected", { count: selectedCount })}
          actions={[
            {
              icon: <DeleteOutlineOutlinedIcon />,
              label: t("timeline:inspector.deleteSelection"),
              onClick: () => deleteSelected(selectedClipIds),
              variant: "danger"
            }
          ]}
        />
        <Text size="small" sx={{ px: 0.5, color: "text.secondary" }}>
          {t("timeline:inspector.multiSelectUnsupported")}
        </Text>
      </Panel>
    );
  }

  if (!clip) return null;

  // Direct-gen and workflow-bound generated clips keep their bespoke panels.
  if (clip.sourceType === "generated") {
    if (
      clip.bindingKind === "text-to-image" ||
      clip.bindingKind === "image-to-image" ||
      clip.bindingKind === "text-to-video" ||
      clip.bindingKind === "text-to-audio"
    ) {
      return <DirectGenClipPanel clipId={clip.id} />;
    }
    return <GeneratedClipPanel clipId={clip.id} />;
  }

  // ── Imported-clip inspector ─────────────────────────────────────────────

  return (
    <Panel
      background="default"
      bordered={false}
      css={containerStyles}
      sx={inspectorPanelSx}
    >
      <ClipIdentityCard
        name={clip.name}
        metadata={identityMeta}
        accentColor={accentColor}
      />

      {textStyle && (
        <>
          <CollapsibleSection
            title={
              <InspectorSectionTitle
                title={t("timeline:inspector.text")}
                icon={<PermMediaOutlinedIcon />}
              />
            }
            open={textOpen}
            onToggle={setTextOpen}
            unmountOnExit
          >
            <FlexColumn css={sectionContentStyles(theme)}>
              <TextInput
                value={textStyle.text}
                multiline
                minRows={3}
                fullWidth
                onChange={(event) =>
                  patchClip(clip.id, {
                    textStyle: { ...textStyle, text: event.target.value }
                  })
                }
                inputProps={{ "aria-label": t("timeline:inspector.textContent") }}
              />
              <InspectorRow label={t("timeline:inspector.fontSize")}>
                <InspectorPillInput
                  value={String(textStyle.fontSizePx)}
                  unit="px"
                  onCommit={(raw) => {
                    const fontSizePx = Number(raw);
                    if (!Number.isFinite(fontSizePx) || fontSizePx < 1) return;
                    patchClip(clip.id, {
                      textStyle: { ...textStyle, fontSizePx }
                    });
                  }}
                  ariaLabel={t("timeline:inspector.textFontSize")}
                />
              </InspectorRow>
              <InspectorRow label={t("timeline:inspector.fontWeight")}>
                <InspectorPillInput
                  value={String(textStyle.fontWeight ?? 400)}
                  onCommit={(raw) => {
                    const fontWeight = Number(raw);
                    if (!Number.isFinite(fontWeight) || fontWeight < 1) return;
                    patchClip(clip.id, {
                      textStyle: { ...textStyle, fontWeight }
                    });
                  }}
                  ariaLabel={t("timeline:inspector.textFontWeight")}
                />
              </InspectorRow>
              <InspectorRow label={t("timeline:inspector.color")}>
                <TextInput
                  type="color"
                  value={textStyle.color}
                  onChange={(event) =>
                    patchClip(clip.id, {
                      textStyle: { ...textStyle, color: event.target.value }
                    })
                  }
                  inputProps={{ "aria-label": t("timeline:inspector.textColor") }}
                />
              </InspectorRow>
              <InspectorRow label={t("timeline:inspector.align")}>
                <InspectorSelect
                  label={t("timeline:inspector.textAlign")}
                  value={textStyle.align ?? "center"}
                  options={TEXT_ALIGN_LABELS}
                  onChange={(value) =>
                    patchClip(clip.id, {
                      textStyle: {
                        ...textStyle,
                        align: value as "left" | "center" | "right"
                      }
                    })
                  }
                />
              </InspectorRow>
            </FlexColumn>
          </CollapsibleSection>
          <InspectorDivider />
        </>
      )}

      <CollapsibleSection
        title={
          <InspectorSectionTitle
            title={t("timeline:inspector.media")}
            icon={<PermMediaOutlinedIcon />}
          />
        }
        open={mediaOpen}
        onToggle={setMediaOpen}
        unmountOnExit
      >
        <FlexColumn css={sectionContentStyles(theme)}>
          <InspectorRow label={t("timeline:inspector.type")}>
            <InspectorStaticValue value={clip.mediaType} />
          </InspectorRow>
          <InspectorRow label={t("timeline:inspector.asset")}>
            <InspectorStaticValue value={clip.currentAssetId ?? "—"} />
          </InspectorRow>
        </FlexColumn>
      </CollapsibleSection>

      <InspectorDivider />

      <CollapsibleSection
        title={
          <InspectorSectionTitle
            title={t("timeline:inspector.timing")}
            icon={<ScheduleOutlinedIcon />}
          />
        }
        open={timingOpen}
        onToggle={setTimingOpen}
        unmountOnExit
      >
        <FlexColumn css={sectionContentStyles(theme)}>
          <InspectorRow label={t("timeline:inspector.start")}>
            <InspectorPillInput
              value={formatTimecode(clip.startMs, fps)}
              onCommit={(raw) => {
                const ms = parseTimecode(raw, fps);
                if (ms == null) return;
                patchClip(clip.id, { startMs: Math.max(0, ms) });
              }}
              minWidth={112}
              ariaLabel={t("timeline:inspector.startTimecode")}
            />
          </InspectorRow>
          <InspectorRow label={t("timeline:inspector.duration")}>
            <InspectorPillInput
              value={(clip.durationMs / 1000).toFixed(2)}
              unit="s"
              scrub={{ step: 0.02, min: 0.01 }}
              onCommit={(raw) => {
                const ms = parseSeconds(raw);
                if (ms == null || ms < 1) return;
                patchClip(clip.id, { durationMs: ms });
              }}
              ariaLabel={t("timeline:inspector.durationSeconds")}
            />
          </InspectorRow>
          <InspectorRow label={t("timeline:inspector.speed")}>
            <InspectorPillInput
              value={(clip.speedMultiplier ?? 1).toFixed(2)}
              unit="×"
              scrub={{ step: 0.01, min: 0.1, max: 8 }}
              onCommit={(raw) => onPatchNumber("speedMultiplier", raw, 0.1, 8)}
              ariaLabel={t("timeline:inspector.playbackSpeed")}
            />
          </InspectorRow>
          <InspectorToggleRow
            label={t("timeline:inspector.hidden")}
            checked={!!clip.hidden}
            onChange={(next) => patchClip(clip.id, { hidden: next })}
          />
        </FlexColumn>
      </CollapsibleSection>

      <ClipAdjustments clip={clip} />

      <ClipAnimations clip={clip} />
    </Panel>
  );
});

TimelineInspector.displayName = "TimelineInspector";
