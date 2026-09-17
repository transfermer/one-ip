import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";

export function CopyButton({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setCopied(false);
  }, [value]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const label = copied ? t("已複製") : t("複製");
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          toast.error(t("自動複製失敗，請長按或選中鏈接複製。"));
        }
      }}
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      <span className="sr-only" role="status">
        {copied ? label : ""}
      </span>
    </Button>
  );
}
