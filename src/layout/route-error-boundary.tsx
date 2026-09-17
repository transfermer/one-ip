import { Component, type PropsWithChildren } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

export class RouteErrorBoundary extends Component<
  PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("加載失敗")}</AlertTitle>
        <AlertDescription>
          <p>{t("頁面暫時無法顯示，請刷新頁面重試。")}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t("刷新頁面")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
}
