/** @jsxImportSource @emotion/react */
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import DataUsageOutlinedIcon from "@mui/icons-material/DataUsageOutlined";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import {
  Caption,
  Card,
  CollapsibleSection,
  FlexColumn,
  FlexRow,
  Text,
  BORDER_RADIUS,
  SPACING
} from "../ui_primitives";

interface CostPoint {
  icon: React.ReactNode;
  titleKey: string;
  bodyKey: string;
}

const COST_POINTS: CostPoint[] = [
  {
    icon: <DataUsageOutlinedIcon sx={{ fontSize: 18 }} />,
    titleKey: "point1Title",
    bodyKey: "point1Body"
  },
  {
    icon: <ImageOutlinedIcon sx={{ fontSize: 18 }} />,
    titleKey: "point2Title",
    bodyKey: "point2Body"
  },
  {
    icon: <PaymentsOutlinedIcon sx={{ fontSize: 18 }} />,
    titleKey: "point3Title",
    bodyKey: "point3Body"
  },
  {
    icon: <SavingsOutlinedIcon sx={{ fontSize: 18 }} />,
    titleKey: "point4Title",
    bodyKey: "point4Body"
  }
];

/**
 * Beginner-friendly explainer for how AI provider billing works — tokens,
 * per-result pricing, who gets charged, and how to start cheaply. Collapsed by
 * default so it doesn't crowd the connect actions but is one click away.
 */
const CostGuide: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation("common");

  return (
    <CollapsibleSection
      defaultOpen={false}
      title={
        <FlexRow align="center" gap={SPACING.xs}>
          <PaymentsOutlinedIcon
            sx={{ fontSize: 18, color: theme.vars.palette.primary.main }}
          />
          <Text size="small" weight={600}>
            {t("providerOnboarding.costsGuideTitle")}
          </Text>
        </FlexRow>
      }
    >
      <FlexColumn gap={SPACING.sm} sx={{ mt: SPACING.sm }}>
        {COST_POINTS.map((point) => (
          <Card
            key={point.titleKey}
            variant="outlined"
            padding="compact"
            sx={{
              borderRadius: BORDER_RADIUS.lg,
              border: `1px solid ${theme.vars.palette.divider}`,
              backgroundColor: theme.vars.palette.background.paper
            }}
          >
            <FlexRow align="flex-start" gap={SPACING.sm}>
              <FlexRow
                align="center"
                justify="center"
                sx={{
                  width: 34,
                  height: 34,
                  minWidth: 34,
                  borderRadius: BORDER_RADIUS.md,
                  color: theme.vars.palette.primary.main,
                  backgroundColor: `rgba(${theme.vars.palette.primary.mainChannel} / 0.12)`
                }}
              >
                {point.icon}
              </FlexRow>
              <FlexColumn gap={SPACING.micro}>
                <Text size="small" weight={600}>
                  {t(`providerOnboarding.costPoints.${point.titleKey}`)}
                </Text>
                <Caption sx={{ opacity: 0.7, lineHeight: 1.5 }}>
                  {t(`providerOnboarding.costPoints.${point.bodyKey}`)}
                </Caption>
              </FlexColumn>
            </FlexRow>
          </Card>
        ))}
      </FlexColumn>
    </CollapsibleSection>
  );
};

export default memo(CostGuide);
