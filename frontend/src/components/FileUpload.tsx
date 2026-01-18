import { useState, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon } from "@hugeicons/core-free-icons";

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  minSize?: string;
  maxSize?: string;
}

export default function FileUpload({
  onFileSelect,
  accept = "image/*",
  multiple = true,
  minSize = "1.00KB",
  maxSize = "10.00MB",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFileSelect(multiple ? files : [files[0]]);
      }
    },
    [onFileSelect, multiple],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onFileSelect(files);
      }
    },
    [onFileSelect],
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
              Drag and drop or click to upload
            </p>
            <p className="text-gray-400 text-sm">
              Accepts {accept} between {minSize} and {maxSize}.
            </p>
          </div>
        </div>
      </label>
    </div>
  );
}
