import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CloudUploadIcon,
  Menu01Icon,
  CheckmarkCircle02Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import SimulationForm from "../components/SimulationForm";
import type { SimulationParams } from "../components/SimulationForm";

export default function HomePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0].name.endsWith(".pdb")) {
      setSelectedFile(files[0]);
      setError(null);
    } else {
      setError("Please upload a .pdb file");
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        setSelectedFile(files[0]);
        setError(null);
      }
    },
    []
  );

  const handleSubmit = async (params: SimulationParams) => {
    if (!selectedFile) {
      setError("Please select a PDB file first");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("pdb_file", selectedFile);
      formData.append("original_filename", selectedFile.name);
      formData.append("duration", params.duration.toString());
      formData.append("temperature", params.temperature.toString());
      formData.append("frame_interval", params.frame_interval.toString());

      if (params.seed !== undefined) {
        formData.append("seed", params.seed.toString());
      }

      if (params.advanced_params) {
        formData.append(
          "advanced_params",
          JSON.stringify(params.advanced_params)
        );
      }

      const response = await apiFetch("/jobs", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Failed to submit job: ${response.statusText}`
        );
      }

      const data = await response.json();
      navigate(`/jobs/${data.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit job");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Dynalab</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/jobs" className="gap-2">
                <HugeiconsIcon icon={Menu01Icon} size={16} />
                View Jobs
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
        <Card>
          <CardHeader>
            <CardTitle>Upload PDB File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative w-full py-12 text-center cursor-pointer transition-all duration-200 border-2 border-dashed rounded-lg hover:bg-accent",
                isDragging
                  ? "border-primary bg-accent"
                  : selectedFile
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                    : "border-border bg-card"
              )}
            >
              <input
                type="file"
                onChange={handleFileInput}
                accept=".pdb"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-3">
                {selectedFile ? (
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    size={40}
                    className="text-green-500"
                  />
                ) : (
                  <HugeiconsIcon
                    icon={CloudUploadIcon}
                    size={40}
                    className="text-muted-foreground"
                  />
                )}
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only .pdb files are accepted
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <SimulationForm onSubmit={handleSubmit} disabled={isSubmitting} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
