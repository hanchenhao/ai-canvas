/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

import {
  FlexRow,
  EditorButton,
  Dialog,
  TextField,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem
} from "../ui_primitives";
import { useCallback, useState, memo, useId } from "react";
import { useTranslation } from "react-i18next";
import { TypeMetadata } from "../../stores/ApiTypes";
import { validateIdentifierName } from "../../utils/identifierValidation";

interface AddDynamicOutputDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, type: TypeMetadata) => void;
}

const TYPE_OPTIONS = [
  { label: "bool", value: "bool" },
  { label: "int", value: "int" },
  { label: "float", value: "float" },
  { label: "string", value: "str" }
];

const AddDynamicOutputDialog: React.FC<AddDynamicOutputDialogProps> = ({
  open,
  onClose,
  onAdd
}) => {
  const { t } = useTranslation("canvas");
  const titleId = useId();
  const [name, setName] = useState("");
  const [type, setType] = useState("str");
  const [nameError, setNameError] = useState<string | undefined>();

  const reset = useCallback(() => {
    setName("");
    setType("str");
    setNameError(undefined);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    const validation = validateIdentifierName(trimmed);
    if (!validation.isValid) {
      setNameError(validation.error);
      return;
    }
    onAdd(trimmed, { type, type_args: [], optional: false });
    reset();
    onClose();
  }, [name, type, onAdd, reset, onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby={titleId}
    >
      <DialogTitle id={titleId}>{t("node.addOutputTitle")}</DialogTitle>
      <DialogContent>
        <FlexRow css={css({ gap: 8, marginTop: 8 })}>
          <TextField
            autoFocus
            label={t("node.nameLabel")}
            size="small"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) {
                setNameError(undefined);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
            error={!!nameError}
            helperText={nameError || t("node.nameCannotStartWithNumber")}
            sx={{ flex: 1 }}
          />
          <TextField
            select
            label={t("node.typeLabel")}
            size="small"
            value={type}
            onChange={(e) => setType(e.target.value)}
            sx={{ width: 140 }}
          >
            {TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </FlexRow>
      </DialogContent>
      <DialogActions>
        <EditorButton onClick={handleClose} variant="text" size="small">
          {t("common:button.cancel")}
        </EditorButton>
        <EditorButton onClick={handleSubmit} variant="contained" size="small">
          {t("common:button.add")}
        </EditorButton>
      </DialogActions>
    </Dialog>
  );
};

export default memo(AddDynamicOutputDialog);
