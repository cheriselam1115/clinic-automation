"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "zh-TW", label: "普通話 (Mandarin)" },
  { value: "yue", label: "廣東話 (Cantonese)" },
];

export function NewAppointmentButton({ clinicId }: { clinicId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [patientName, setPatientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [appointmentAt, setAppointmentAt] = useState("");
  const [appointmentType, setAppointmentType] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Upsert patient
      const patientRes = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: patientName, phoneNumber, preferredLanguage }),
      });

      if (!patientRes.ok) {
        const data = await patientRes.json();
        throw new Error(data.error ?? "Failed to create patient");
      }

      const patient = await patientRes.json();

      // Create appointment
      const apptRes = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          appointmentAt,
          appointmentType,
          notes,
        }),
      });

      if (!apptRes.ok) {
        const data = await apptRes.json();
        throw new Error(data.error ?? "Failed to create appointment");
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setPatientName("");
    setPhoneNumber("");
    setPreferredLanguage("en");
    setAppointmentAt("");
    setAppointmentType("");
    setNotes("");
    setError("");
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ New Appointment</Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Patient Name</Label>
              <Input
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Full name"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Phone Number</Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+16041234567"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Language Preference</Label>
              <Select value={preferredLanguage} onValueChange={(v) => v && setPreferredLanguage(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Appointment Date & Time</Label>
              <Input
                type="datetime-local"
                value={appointmentAt}
                onChange={(e) => setAppointmentAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Appointment Type</Label>
              <Input
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value)}
                placeholder="e.g. Cleaning, Check-up"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for the receptionist"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Booking…" : "Book & Send SMS"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
