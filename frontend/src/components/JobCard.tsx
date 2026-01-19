import { Link } from "react-router-dom";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Clock01Icon,
  CheckmarkCircle02Icon,
  CancelCircleIcon,
  Loading03Icon,
  RecordIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface JobCardProps {
  job_id: string;
  original_filename: string;
  status: "pending" | "queued" | "running" | "completed" | "failed";
  duration: number;
  temperature: number;
  created_at: string;
  completed_at?: string;
}

const statusConfig: Record<
  JobCardProps["status"],
  {
    icon: IconSvgElement;
    variant: "muted" | "warning" | "info" | "success" | "destructive";
    label: string;
    animate?: boolean;
  }
> = {
  pending: {
    icon: RecordIcon,
    variant: "muted",
    label: "Pending",
  },
  queued: {
    icon: Clock01Icon,
    variant: "warning",
    label: "Queued",
  },
  running: {
    icon: Loading03Icon,
    variant: "info",
    label: "Running",
    animate: true,
  },
  completed: {
    icon: CheckmarkCircle02Icon,
    variant: "success",
    label: "Completed",
  },
  failed: {
    icon: CancelCircleIcon,
    variant: "destructive",
    label: "Failed",
  },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export default function JobCard({
  job_id,
  original_filename,
  status,
  duration,
  temperature,
  created_at,
}: JobCardProps) {
  const config = statusConfig[status];

  return (
    <Link to={`/jobs/${job_id}`} className="block">
      <Card className="p-4 hover:border-muted-foreground/50 hover:shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-medium text-foreground truncate">
                {original_filename}
              </h3>
              <Badge variant={config.variant} className="gap-1">
                <HugeiconsIcon
                  icon={config.icon}
                  size={12}
                  className={config.animate ? "animate-spin" : ""}
                />
                {config.label}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              T={temperature}, {duration} steps
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {formatTimeAgo(created_at)}
            </span>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={16}
              className="text-muted-foreground"
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}
