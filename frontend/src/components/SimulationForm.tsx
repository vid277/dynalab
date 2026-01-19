import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

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
        <h3 className="text-lg font-medium text-foreground">Basic Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                id="duration"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
                min={1}
                disabled={disabled}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                time units
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              type="number"
              id="temperature"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
              step={0.1}
              min={0.1}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frameInterval">Frame Interval</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                id="frameInterval"
                value={frameInterval}
                onChange={(e) =>
                  setFrameInterval(parseInt(e.target.value, 10) || 0)
                }
                min={1}
                disabled={disabled}
              />
              <span className="text-sm text-muted-foreground">frames</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seed">Random Seed (optional)</Label>
            <Input
              type="number"
              id="seed"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Leave empty for random"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => setShowAdvanced(!showAdvanced)}
        disabled={disabled}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon
          icon={showAdvanced ? ArrowUp01Icon : ArrowDown01Icon}
          size={16}
        />
        Advanced Settings
      </Button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="forceField">Force Field</Label>
                <Select
                  id="forceField"
                  value={forceField}
                  onChange={(e) => setForceField(e.target.value)}
                  disabled={disabled}
                >
                  <option value="ff_2.1">ff_2.1</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hbScale">H-Bond Scale</Label>
                <Input
                  type="number"
                  id="hbScale"
                  value={hbScale}
                  onChange={(e) => setHbScale(parseFloat(e.target.value) || 0)}
                  step={0.1}
                  min={0}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="envScale">Environment Scale</Label>
                <Input
                  type="number"
                  id="envScale"
                  value={envScale}
                  onChange={(e) => setEnvScale(parseFloat(e.target.value) || 0)}
                  step={0.1}
                  min={0}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rotScale">Rotamer Scale</Label>
                <Input
                  type="number"
                  id="rotScale"
                  value={rotScale}
                  onChange={(e) => setRotScale(parseFloat(e.target.value) || 0)}
                  step={0.1}
                  min={0}
                  disabled={disabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button type="submit" disabled={disabled} className="w-full" size="lg">
        {disabled ? "Submitting..." : "Run Simulation"}
      </Button>
    </form>
  );
}
