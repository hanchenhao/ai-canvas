/**
 * EntityEditorDialog — tag an existing image asset as a reusable entity, or edit
 * an existing entity's fields. The reference image is chosen upstream (the
 * library picks the asset first); this dialog only writes the marker fields via
 * {@link useSaveEntity}.
 */

import React, { memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Entity, EntityKind } from "@nodetool-ai/protocol";
import {
  Dialog,
  Label,
  TextInput,
  ToggleGroup,
  ToggleOption,
  FlexColumn,
  SPACING
} from "../ui_primitives";
import { useSaveEntity } from "../../serverState/useEntities";

export interface EntityEditorDialogProps {
  open: boolean;
  onClose: () => void;
  /** The image asset to tag as this entity's reference. */
  assetId: string;
  /** When editing, prefill from this entity. */
  entity?: Entity;
  onSaved?: (entity: Entity | null) => void;
}

const KINDS: EntityKind[] = ["character", "location", "style", "prop"];

const EntityEditorDialogInternal: React.FC<EntityEditorDialogProps> = ({
  open,
  onClose,
  assetId,
  entity,
  onSaved
}) => {
  const { t } = useTranslation("common");
  const saveEntity = useSaveEntity();
  const [kind, setKind] = useState<EntityKind>("character");
  const [name, setName] = useState("");
  const [descriptor, setDescriptor] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setKind(entity?.kind ?? "character");
    setName(entity?.name ?? "");
    setDescriptor(entity?.descriptor ?? "");
    setVoiceId(entity?.voice_id ?? "");
    setTags(entity?.tags?.join(", ") ?? "");
  }, [open, entity]);

  const handleKindChange = useCallback(
    (_e: React.MouseEvent<HTMLElement>, value: EntityKind | null) => {
      if (value) {
        setKind(value);
      }
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    const saved = await saveEntity.mutateAsync({
      assetId,
      kind,
      name: name.trim(),
      descriptor: descriptor.trim(),
      voice_id: kind === "character" ? voiceId.trim() || null : null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    });
    onSaved?.(saved);
    onClose();
  }, [
    saveEntity,
    assetId,
    kind,
    name,
    descriptor,
    voiceId,
    tags,
    onSaved,
    onClose
  ]);

  const canSave = name.trim().length > 0 && descriptor.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        entity
          ? t("common:entities.editEntity")
          : t("common:entities.newEntity")
      }
      showActions
      onConfirm={handleConfirm}
      confirmText={
        entity ? t("common:button.save") : t("common:button.create")
      }
      confirmDisabled={!canSave}
      isLoading={saveEntity.isPending}
    >
      <FlexColumn gap={SPACING.md} sx={{ pt: 1, minWidth: 360 }}>
        <FlexColumn gap={SPACING.xs}>
          <Label>{t("common:entities.kind")}</Label>
          <ToggleGroup
            value={kind}
            exclusive
            onChange={handleKindChange}
            size="small"
            segmented
          >
            {KINDS.map((k) => (
              <ToggleOption key={k} value={k}>
                {t(`common:entities.kindLabels.${k}`)}
              </ToggleOption>
            ))}
          </ToggleGroup>
        </FlexColumn>

        <TextInput
          label={t("common:entities.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
          compact
        />

        <TextInput
          label={t("common:entities.descriptor")}
          helperText={t("common:entities.descriptorHint")}
          value={descriptor}
          onChange={(e) => setDescriptor(e.target.value)}
          multiline
          rows={3}
          size="small"
          compact
        />

        {kind === "character" && (
          <TextInput
            label={t("common:entities.voiceIdOptional")}
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            size="small"
            compact
          />
        )}

        <TextInput
          label={t("common:entities.tagsCommaSeparated")}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          size="small"
          compact
        />
      </FlexColumn>
    </Dialog>
  );
};

export const EntityEditorDialog = memo(EntityEditorDialogInternal);
export default EntityEditorDialog;
