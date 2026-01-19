import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Download01Icon,
  ArrowReloadHorizontalIcon,
  CheckmarkCircle02Icon,
  CancelCircleIcon,
  Clock01Icon,
  Loading03Icon,
  RecordIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

type JobStatus = "pending" | "queued" | "running" | "completed" | "failed";

interface JobParams {
  duration: number;
  temperature: number;
  frame_interval: number;
  seed?: number;
  advanced_params?: Record<string, unknown>;
}

interface JobResults {
  residue_count?: number;
  atom_count?: number;
  frame_count?: number;
  final_potential?: number;
  final_rg?: number;
  final_hbonds?: number;
}

interface JobDetail {
  job_id: string;
  original_filename: string;
  status: JobStatus;
  params: JobParams;
  results?: JobResults;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

const statusConfig: Record<
  JobStatus,
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

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = async () => {
    if (!id) return;

    try {
      const response = await fetch(`${API_URL}/jobs/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch job");
      }
      const data: JobDetail = await response.json();
      setJob(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch job");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();

    // Poll for updates while job is not completed or failed
    const interval = setInterval(() => {
      if (job && (job.status === "completed" || job.status === "failed")) {
        return;
      }
      fetchJob();
    }, 3000);

    return () => clearInterval(interval);
  }, [id, job?.status]);

  const handleDownload = (fileType: "trajectory" | "log" | "vtf") => {
    window.open(`${API_URL}/jobs/${id}/download/${fileType}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <HugeiconsIcon
          icon={ArrowReloadHorizontalIcon}
          size={32}
          className="text-muted-foreground animate-spin"
        />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Button variant="ghost" asChild className="gap-2">
              <Link to="/jobs">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                Back to Jobs
              </Link>
            </Button>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>{error || "Job not found"}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const config = statusConfig[job.status];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Button variant="ghost" asChild className="gap-2">
            <Link to="/jobs">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              Back to Jobs
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-foreground">
                {job.original_filename}
              </h1>
              <Badge variant={config.variant} className="gap-2 px-3 py-1">
                <HugeiconsIcon
                  icon={config.icon}
                  size={16}
                  className={config.animate ? "animate-spin" : ""}
                />
                {config.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {job.error_message && (
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Error:</strong> {job.error_message}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">Duration</dt>
                <dd className="text-base font-medium text-foreground">
                  {job.params.duration}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Temperature</dt>
                <dd className="text-base font-medium text-foreground">
                  {job.params.temperature}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Frame Interval</dt>
                <dd className="text-base font-medium text-foreground">
                  {job.params.frame_interval}
                </dd>
              </div>
              {job.params.seed && (
                <div>
                  <dt className="text-sm text-muted-foreground">Seed</dt>
                  <dd className="text-base font-medium text-foreground">
                    {job.params.seed}
                  </dd>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {job.results && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {job.results.residue_count !== undefined && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Residues</dt>
                    <dd className="text-base font-medium text-foreground">
                      {job.results.residue_count}
                    </dd>
                  </div>
                )}
                {job.results.atom_count !== undefined && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Atoms</dt>
                    <dd className="text-base font-medium text-foreground">
                      {job.results.atom_count}
                    </dd>
                  </div>
                )}
                {job.results.frame_count !== undefined && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Frames</dt>
                    <dd className="text-base font-medium text-foreground">
                      {job.results.frame_count}
                    </dd>
                  </div>
                )}
                {job.results.final_potential !== undefined && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Final Energy</dt>
                    <dd className="text-base font-medium text-foreground">
                      {job.results.final_potential.toFixed(2)}
                    </dd>
                  </div>
                )}
                {job.results.final_rg !== undefined && (
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      Radius of Gyration
                    </dt>
                    <dd className="text-base font-medium text-foreground">
                      {job.results.final_rg.toFixed(1)} A
                    </dd>
                  </div>
                )}
                {job.results.final_hbonds !== undefined && (
                  <div>
                    <dt className="text-sm text-muted-foreground">H-bonds</dt>
                    <dd className="text-base font-medium text-foreground">
                      {job.results.final_hbonds}
                    </dd>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {job.status === "completed" && (
          <Card>
            <CardHeader>
              <CardTitle>Downloads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleDownload("trajectory")}
                  className="gap-2"
                >
                  <HugeiconsIcon icon={Download01Icon} size={16} />
                  Trajectory (.up)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownload("log")}
                  className="gap-2"
                >
                  <HugeiconsIcon icon={Download01Icon} size={16} />
                  Log File
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownload("vtf")}
                  className="gap-2"
                >
                  <HugeiconsIcon icon={Download01Icon} size={16} />
                  VMD File (.vtf)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
