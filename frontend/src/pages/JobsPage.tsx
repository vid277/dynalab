import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowReloadHorizontalIcon, Logout01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import JobCard from "../components/JobCard";
import type { JobCardProps } from "../components/JobCard";

interface JobsResponse {
  jobs: JobCardProps[];
}

export default function JobsPage() {
  const { logout } = useAuth();
  const [jobs, setJobs] = useState<JobCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      const response = await apiFetch("/jobs");
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }
      const data: JobsResponse = await response.json();
      setJobs(data.jobs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold text-foreground">
            Dynalab
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link to="/" className="gap-2">
                <HugeiconsIcon icon={Add01Icon} size={16} />
                New Simulation
              </Link>
            </Button>
            <Button variant="ghost" onClick={logout} className="gap-2">
              <HugeiconsIcon icon={Logout01Icon} size={16} />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-foreground">
            Your Simulations
          </h2>
          <Button variant="ghost" onClick={fetchJobs} className="gap-2">
            <HugeiconsIcon
              icon={ArrowReloadHorizontalIcon}
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && jobs.length === 0 ? (
          <div className="text-center py-12">
            <HugeiconsIcon
              icon={ArrowReloadHorizontalIcon}
              size={32}
              className="text-muted-foreground animate-spin mx-auto mb-4"
            />
            <p className="text-muted-foreground">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">No simulations yet</p>
              <Button asChild>
                <Link to="/" className="gap-2">
                  <HugeiconsIcon icon={Add01Icon} size={16} />
                  Start your first simulation
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard key={job.job_id} {...job} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
