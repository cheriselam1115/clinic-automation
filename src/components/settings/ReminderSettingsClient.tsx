"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReminderConfig } from "@prisma/client";

type ConfigRow = { hoursBefore: number; label: string };

function hoursToLabel(h: number): string {
  if (h >= 24 && h % 24 === 0) return `${h / 24} day${h / 24 > 1 ? "s" : ""} before`;
  return `${h} hour${h > 1 ? "s" : ""} before`;
}

export function ReminderSettingsClient({
  initialConfigs,
}: {
  initialConfigs: ReminderConfig[];
}) {
  const [configs, setConfigs] = useState<ConfigRow[]>(
    initialConfigs.map((c) => ({ hoursBefore: c.hoursBefore, label: c.label }))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addRow() {
    setConfigs([...configs, { hoursBefore: 24, label: "24-hour reminder" }]);
  }

  function removeRow(idx: number) {
    setConfigs(configs.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, field: keyof ConfigRow, value: string | number) {
    const updated = [...configs];
    if (field === "hoursBefore") {
      updated[idx].hoursBefore = Number(value);
      updated[idx].label = hoursToLabel(Number(value));
    } else {
      updated[idx].label = value as string;
    }
    setConfigs(updated);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configs }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg divide-y">
        {configs.length === 0 && (
          <p className="px-4 py-3 text-sm text-gray-400">No reminders configured.</p>
        )}
        {configs.map((row, idx) => (
          <div key={idx} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-gray-500">Hours before appointment</Label>
              <Input
                type="number"
                min={1}
                value={row.hoursBefore}
                onChange={(e) => updateRow(idx, "hoursBefore", e.target.value)}
                className="w-28"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-gray-500">Label</Label>
              <Input
                value={row.label}
                onChange={(e) => updateRow(idx, "label", e.target.value)}
              />
            </div>
            <button
              onClick={() => removeRow(idx)}
              className="mt-5 text-gray-400 hover:text-red-500 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={addRow}>
          + Add reminder
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
      </div>

      <p className="text-xs text-gray-400">
        Example: 192 hours = 8 days, 48 hours = 2 days, 2 hours = 2 hours before the appointment.
        The system checks every 15 minutes and sends reminders in the right window.
      </p>
    </div>
  );
}
