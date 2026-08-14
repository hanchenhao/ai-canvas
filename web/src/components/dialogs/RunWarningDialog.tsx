/** @jsxImportSource @emotion/react */
import React, { memo, useCallback, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useRunWarningStore } from "../../stores/RunWarningStore";
import { Dialog, Checkbox, Text, FlexColumn } from "../ui_primitives";

/**
 * Confirmation shown before a "Run Workflow" that would execute many
 * provider/model nodes at once. Mounted once at the app root; driven entirely
 * by {@link useRunWarningStore}.
 */
const RunWarningDialog: React.FC = () => {
  const { t } = useTranslation("common");
  const open = useRunWarningStore((s) => s.open);
  const kind = useRunWarningStore((s) => s.kind);
  const heavyCount = useRunWarningStore((s) => s.heavyCount);
  const threshold = useRunWarningStore((s) => s.threshold);
  const confirm = useRunWarningStore((s) => s.confirm);
  const cancel = useRunWarningStore((s) => s.cancel);

  const [dontAskAgain, setDontAskAgain] = useState(false);

  const handleConfirm = useCallback(() => {
    // The session suppression only applies to the heavy-run warning; a
    // concurrent-run confirmation always asks.
    confirm(kind === "heavy" && dontAskAgain);
    setDontAskAgain(false);
  }, [confirm, dontAskAgain, kind]);

  const handleCancel = useCallback(() => {
    cancel();
    setDontAskAgain(false);
  }, [cancel]);

  const isConcurrent = kind === "concurrent";

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      title={
        isConcurrent
          ? t("common:dialogs.runWarningConcurrentTitle")
          : t("common:dialogs.runWarningHeavyTitle")
      }
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      confirmText={
        isConcurrent
          ? t("common:dialogs.runWarningConcurrentConfirm")
          : t("common:dialogs.runWarningHeavyConfirm")
      }
      cancelText={t("common:button.cancel")}
      content={
        <FlexColumn gap={1.5}>
          {isConcurrent ? (
            <Text>
              <Trans
                ns="common"
                i18nKey="dialogs.runWarningConcurrentContent"
                components={{ strong: <strong /> }}
              />
            </Text>
          ) : (
            <>
              <Text>
                <Trans
                  ns="common"
                  i18nKey="dialogs.runWarningHeavyContent"
                  values={{ count: heavyCount, threshold }}
                  components={{ strong: <strong /> }}
                />
              </Text>
              <Checkbox
                label={t("common:dialogs.dontAskAgainSession")}
                checked={dontAskAgain}
                onChange={(_event, checked) => setDontAskAgain(checked)}
              />
            </>
          )}
        </FlexColumn>
      }
    />
  );
};

RunWarningDialog.displayName = "RunWarningDialog";

export default memo(RunWarningDialog);
