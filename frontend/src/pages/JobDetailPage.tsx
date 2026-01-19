import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Circle,
} from "lucide-react";

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

const statusConfig = {
  pending: {
    icon: Circle,
    color: "text-gray-500",
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error || "Job not found"}
          </div>
        </main>
      </div>
    );
  }

  const config = statusConfig[job.status];
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              {job.original_filename}
            </h1>
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}
            >
              <StatusIcon
                className={`w-4 h-4 ${
                  "animate" in config && config.animate ? "animate-spin" : ""
                }`}
              />
              {config.label}
            </span>
          </div>
        </div>

        {job.error_message && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <strong>Error:</strong> {job.error_message}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Parameters</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Duration</dt>
              <dd className="text-base font-medium text-gray-900">
                {job.params.duration}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Temperature</dt>
              <dd className="text-base font-medium text-gray-900">
                {job.params.temperature}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Frame Interval</dt>
              <dd className="text-base font-medium text-gray-900">
                {job.params.frame_interval}
              </dd>
            </div>
            {job.params.seed && (
              <div>
                <dt className="text-sm text-gray-500">Seed</dt>
                <dd className="text-base font-medium text-gray-900">
                  {job.params.seed}
                </dd>
              </div>
            )}
          </div>
        </div>

        {job.results && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {job.results.residue_count !== undefined && (
                <div>
                  <dt className="text-sm text-gray-500">Residues</dt>
                  <dd className="text-base font-medium text-gray-900">
                    {job.results.residue_count}
                  </dd>
                </div>
              )}
              {job.results.atom_count !== undefined && (
                <div>
                  <dt className="text-sm text-gray-500">Atoms</dt>
                  <dd className="text-base font-medium text-gray-900">
                    {job.results.atom_count}
                  </dd>
                </div>
              )}
              {job.results.frame_count !== undefined && (
                <div>
                  <dt className="text-sm text-gray-500">Frames</dt>
                  <dd className="text-base font-medium text-gray-900">
                    {job.results.frame_count}
                  </dd>
                </div>
              )}
              {job.results.final_potential !== undefined && (
                <div>
                  <dt className="text-sm text-gray-500">Final Energy</dt>
                  <dd className="text-base font-medium text-gray-900">
                    {job.results.final_potential.toFixed(2)}
                  </dd>
                </div>
              )}
              {job.results.final_rg !== undefined && (
                <div>
                  <dt className="text-sm text-gray-500">Radius of Gyration</dt>
                  <dd className="text-base font-medium text-gray-900">
                    {job.results.final_rg.toFixed(1)} A
                  </dd>
                </div>
              )}
              {job.results.final_hbonds !== undefined && (
                <div>
                  <dt className="text-sm text-gray-500">H-bonds</dt>
                  <dd className="text-base font-medium text-gray-900">
                    {job.results.final_hbonds}
                  </dd>
                </div>
              )}
            </div>
          </div>
        )}

        {job.status === "completed" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Downloads
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleDownload("trajectory")}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Trajectory (.up)
              </button>
              <button
                onClick={() => handleDownload("log")}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Log File
              </button>
              <button
                onClick={() => handleDownload("vtf")}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                VMD File (.vtf)
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
