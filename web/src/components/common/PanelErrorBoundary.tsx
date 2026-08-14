import React from "react";
import { useTranslation } from "react-i18next";
import { Text, FlexRow } from "../ui_primitives";

const PanelErrorFallback: React.FC = () => {
  const { t } = useTranslation("common");
  return (
    <FlexRow
      align="center"
      justify="center"
      sx={{
        padding: 3,
        minHeight: 200,
        bgcolor: "error.dark",
        color: "error.contrastText"
      }}
    >
      <Text size="small" component="div">
        {t("errorBoundary.panelFailedToRender")}
      </Text>
    </FlexRow>
  );
};

interface PanelErrorBoundaryProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface PanelErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// React error boundaries must be class components: getDerivedStateFromError and
// componentDidCatch have no functional-component equivalent.
export default class PanelErrorBoundary extends React.Component<
  PanelErrorBoundaryProps,
  PanelErrorBoundaryState
> {
  constructor(props: PanelErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): PanelErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Panel crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? <PanelErrorFallback />
      );
    }
    return this.props.children;
  }
}
