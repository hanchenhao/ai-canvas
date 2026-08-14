import { useTranslation, Trans } from "react-i18next";
import {
  Text,
  FlexColumn,
  Divider,
  Box,
  SPACING,
  getSpacingPx
} from "../ui_primitives";

const EmptyCollectionState = () => {
  const { t } = useTranslation("collections");
  return (
    <Box sx={{ marginTop: 2, maxWidth: 600 }}>
      <Text size="big" sx={{ margin: "1em 0 .5em 0" }}>
        {t("title.vectorCollections")}
      </Text>
      <Text sx={{ marginBottom: 1 }}>{t("empty.description1")}</Text>
      <Text sx={{ marginBottom: 2 }}>{t("empty.description2")}</Text>

      <Divider sx={{ my: 3 }} />

      <FlexColumn gap={2}>
        <Text size="big">{t("empty.intro")}</Text>

        <Text>{t("empty.withCollectionIntro")}</Text>
        <ul
          style={{
            paddingLeft: getSpacingPx(SPACING.xl),
            marginBottom: getSpacingPx(SPACING.xs),
            listStyle: "disc"
          }}
        >
          <li>{t("empty.feature1")}</li>
          <li>{t("empty.feature2")}</li>
          <li>{t("empty.feature3")}</li>
          <li>{t("empty.feature4")}</li>
        </ul>
        <Text>
          <Trans
            i18nKey="collections:empty.nodeList"
            components={{ strong: <strong /> }}
          />
        </Text>
      </FlexColumn>
    </Box>
  );
};

export default EmptyCollectionState;
