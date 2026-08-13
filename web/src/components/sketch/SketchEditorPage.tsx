/**
 * SketchEditorPage
 *
 * Top-level page shell for the standalone Image Editor at `/sketch/:documentId`.
 * Reads the route param and delegates document loading + editor mounting to
 * `StandaloneSketchEditor` (shared with the embedded workspace image tab).
 */

import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { EmptyState, FlexColumn } from "../ui_primitives";
import StandaloneSketchEditor from "./StandaloneSketchEditor";

const SketchEditorPage: React.FC = memo(function SketchEditorPage() {
  const { t } = useTranslation("sketch");
  const { documentId } = useParams<{ documentId: string }>();

  if (!documentId) {
    const { t } = useTranslation("sketch");
    return (
      <FlexColumn
        align="center"
        justify="center"
        sx={{ flex: 1, width: "100%", height: "100%" }}
      >
        <EmptyState
          variant="error"
          title={t("sketch:sketchModal.noDocumentId")}
          description={t("sketch:sketchModal.routeMissingDocId")}
        />
      </FlexColumn>
    );
  }

  return <StandaloneSketchEditor documentId={documentId} />;
});

SketchEditorPage.displayName = "SketchEditorPage";

export default SketchEditorPage;
