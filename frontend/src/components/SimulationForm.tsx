import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface SimulationParams {
  duration: number;
  temperature: number;
  frame_interval: number;
  seed?: number;
  advanced_params?: {
    force_field: string;
    hb_scale: number;
    env_scale: number;
    rot_scale: number;
  };
}

interface SimulationFormProps {
  onSubmit: (params: SimulationParams) => void;
  disabled?: boolean;
}

export default function SimulationForm({
  onSubmit,
  disabled = false,
}: SimulationFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Basic parameters
  const [duration, setDuration] = useState(1000);
  const [temperature, setTemperature] = useState(0.8);
  const [frameInterval, setFrameInterval] = useState(100);
  const [seed, setSeed] = useState<string>("");

  // Advanced parameters
  const [forceField, setForceField] = useState("ff_2.1");
  const [hbScale, setHbScale] = useState(1.0);
  const [envScale, setEnvScale] = useState(1.0);
  const [rotScale, setRotScale] = useState(1.0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params: SimulationParams = {
      duration,
      temperature,
      frame_interval: frameInterval,
      seed: seed ? parseInt(seed, 10) : undefined,
    };

    if (showAdvanced) {
      params.advanced_params = {
        force_field: forceField,
        hb_scale: hbScale,
        env_scale: envScale,
        rot_scale: rotScale,
      };
    }

    onSubmit(params);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Basic Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="duration"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Duration
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="duration"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
                min={1}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={disabled}
              />
              <span className="text-sm text-gray-500">time units</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="temperature"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Temperature
            </label>
            <input
              type="number"
              id="temperature"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
              step={0.1}
              min={0.1}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled={disabled}
            />
          </div>

          <div>
            <label
              htmlFor="frameInterval"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Frame Interval
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="frameInterval"
                value={frameInterval}
                onChange={(e) =>
                  setFrameInterval(parseInt(e.target.value, 10) || 0)
                }
                min={1}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={disabled}
              />
              <span className="text-sm text-gray-500">frames</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="seed"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Random Seed (optional)
            </label>
            <input
              type="number"
              id="seed"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Leave empty for random"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        disabled={disabled}
      >
        {showAdvanced ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        Advanced Settings
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="forceField"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Force Field
              </label>
              <select
                id="forceField"
                value={forceField}
                onChange={(e) => setForceField(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={disabled}
              >
                <option value="ff_2.1">ff_2.1</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="hbScale"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                H-Bond Scale
              </label>
              <input
                type="number"
                id="hbScale"
                value={hbScale}
                onChange={(e) => setHbScale(parseFloat(e.target.value) || 0)}
                step={0.1}
                min={0}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={disabled}
              />
            </div>

            <div>
              <label
                htmlFor="envScale"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Environment Scale
              </label>
              <input
                type="number"
                id="envScale"
                value={envScale}
                onChange={(e) => setEnvScale(parseFloat(e.target.value) || 0)}
                step={0.1}
                min={0}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={disabled}
              />
            </div>

            <div>
              <label
                htmlFor="rotScale"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Rotamer Scale
              </label>
              <input
                type="number"
                id="rotScale"
                value={rotScale}
                onChange={(e) => setRotScale(parseFloat(e.target.value) || 0)}
                step={0.1}
                min={0}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {disabled ? "Submitting..." : "Run Simulation"}
      </button>
    </form>
  );
}
