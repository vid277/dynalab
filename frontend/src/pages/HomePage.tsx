import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CloudUpload, List } from "lucide-react";
import SimulationForm from "../components/SimulationForm";
import type { SimulationParams } from "../components/SimulationForm";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function HomePage() {
  const navigate = useNavigate();
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
    [],
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
          JSON.stringify(params.advanced_params),
        );
      }

      const response = await fetch(`${API_URL}/jobs`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Failed to submit job: ${response.statusText}`,
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Dynalab</h1>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <List className="w-4 h-4" />
            View Jobs
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Upload PDB File
            </h2>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative w-full py-12 text-center cursor-pointer transition-all duration-200 border-2 border-dashed rounded-lg hover:bg-gray-50 ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : selectedFile
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 bg-white"
              }`}
            >
              <input
                type="file"
                onChange={handleFileInput}
                accept=".pdb"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-3">
                <CloudUpload
                  className={`w-10 h-10 ${
                    selectedFile ? "text-green-500" : "text-gray-400"
                  }`}
                />
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-medium text-green-700">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">
                      Drag and drop or click to upload
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Only .pdb files are accepted
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <SimulationForm onSubmit={handleSubmit} disabled={isSubmitting} />
        </div>
      </main>
    </div>
  );
}
