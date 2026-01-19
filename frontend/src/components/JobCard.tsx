import { Link } from "react-router-dom";
import { Clock, CheckCircle, XCircle, Loader2, Circle } from "lucide-react";

export interface JobCardProps {
  job_id: string;
  original_filename: string;
  status: "pending" | "queued" | "running" | "completed" | "failed";
  duration: number;
  temperature: number;
  created_at: string;
  completed_at?: string;
}

const statusConfig = {
  pending: {
    icon: Circle,
    color: "text-gray-400",
    bgColor: "bg-gray-100",
    label: "Pending",
  },
  queued: {
    icon: Clock,
    color: "text-yellow-500",
    bgColor: "bg-yellow-50",
    label: "Queued",
  },
  running: {
    icon: Loader2,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    label: "Running",
    animate: true,
  },
  completed: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-50",
    label: "Completed",
  },
  failed: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-50",
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
  const StatusIcon = config.icon;

  return (
    <Link
      to={`/jobs/${job_id}`}
      className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-medium text-gray-900 truncate">
              {original_filename}
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
            >
              <StatusIcon
                className={`w-3 h-3 ${
                  "animate" in config && config.animate ? "animate-spin" : ""
                }`}
              />
              {config.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            T={temperature}, {duration} steps
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            {formatTimeAgo(created_at)}
          </span>
          <span className="text-gray-300">&rarr;</span>
        </div>
      </div>
    </Link>
  );
}
