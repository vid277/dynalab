import { useState, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon } from "@hugeicons/core-free-icons";

interface FileUploadProps {
  onFileSelect?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  minSize?: string;
  maxSize?: string;
  uploadUrl?: string;
}

async function uploadFileToServer(file: File, uploadUrl: string) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorDetail = await response.json().catch(() => ({}));
    throw new Error(
      errorDetail.detail || `Upload failed: ${response.statusText}`,
    );
  }

  return response.json();
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function FileUpload({
  onFileSelect,
  accept = ".pdb",
  multiple = true,
  minSize = "1.00KB",
  maxSize = "10.00MB",
  uploadUrl = `${API_URL}/file/upload`,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      onFileSelect?.(files);
      setError(null);

      setIsUploading(true);
      try {
        for (const file of files) {
          await uploadFileToServer(file, uploadUrl);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [onFileSelect, uploadUrl],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFiles(multiple ? files : [files[0]]);
      }
    },
    [handleFiles, multiple],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full max-w-4xl py-16 text-center cursor-pointer transition-all duration-200 border-2 border-dashed rounded-lg hover:bg-gray-50 ${
        isDragging ? "border-blue-500 bg-gray-100" : "border-gray-300 bg-white"
      }`}
    >
      <input
        type="file"
        onChange={handleFileInput}
        accept={accept}
        multiple={multiple}
        className="hidden"
        id="file-input"
      />
      <label htmlFor="file-input" className="cursor-pointer">
        <div className="flex flex-col items-center gap-4">
          <HugeiconsIcon icon={CloudUploadIcon} size={48} color="#666" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Upload files
            </h3>
            <p className="text-gray-400 text-sm">
              {isUploading
                ? "Uploading..."
                : "Drag and drop or click to upload."}
            </p>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        </div>
      </label>
    </div>
  );
}
