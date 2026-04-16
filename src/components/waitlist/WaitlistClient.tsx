"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WaitlistOffer {
  id: string;
  offeredApptAt: string;
  offeredApptType: string | null;
  offerExpiresAt: string;
  status: string;
}

interface WaitlistEntry {
  id: string;
  status: string;
  appointmentType: string | null;
  preferredDateFrom: string | null;
  preferredDateTo: string | null;
  timePreference: string;
  notes: string | null;
  createdAt: string;
  patient: {
    id: string;
    name: string;
    phoneNumber: string;
    preferredLanguage: string;
  };
  offers: WaitlistOffer[];
}

interface PatientResult {
  id: string;
  name: string;
  phoneNumber: string;
  preferredLanguage: string;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  waiting:  { label: "Waiting",    classes: "bg-blue-100 text-blue-800" },
  offered:  { label: "Offer Sent", classes: "bg-amber-100 text-amber-800" },
  booked:   { label: "Booked",     classes: "bg-emerald-100 text-emerald-800" },
  removed:  { label: "Removed",    classes: "bg-[#eceef0] text-[#414750]" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, classes: "bg-[#eceef0] text-[#414750]" };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

// ─── Time remaining ───────────────────────────────────────────────────────────

function TimeRemaining({ expiresAt }: { expiresAt: string }) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return <span className="text-xs text-red-500">Expired</span>;
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const display = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
  return <span className="text-xs text-amber-600 font-medium">{display} left</span>;
}

// ─── Add to Waitlist modal ────────────────────────────────────────────────────

function AddToWaitlistModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [appointmentType, setAppointmentType] = useState("");
  const [preferredDateFrom, setPreferredDateFrom] = useState("");
  const [preferredDateTo, setPreferredDateTo] = useState("");
  const [timePreference, setTimePreference] = useState("any");
  const [notes, setNotes] = useState("");

  async function searchPatients(q: string) {
    setPatientSearch(q);
    if (q.length < 2) { setPatientResults([]); return; }
    try {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setPatientResults(data);
    } catch {
      setPatientResults([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) { setError("Please select a patient"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          appointmentType: appointmentType.trim() || null,
          preferredDateFrom: preferredDateFrom || null,
          preferredDateTo: preferredDateTo || null,
          timePreference,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add to waitlist");
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Patient search */}
      <div className="space-y-1">
        <Label>Patient</Label>
        {selectedPatient ? (
          <div className="flex items-center justify-between bg-[#f7f9fb] rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-bold text-[#191c1e]">{selectedPatient.name}</p>
              <p className="text-xs text-[#414750]">{selectedPatient.phoneNumber}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPatient(null)}
              className="text-xs text-[#004471] hover:underline"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <Input
              value={patientSearch}
              onChange={(e) => searchPatients(e.target.value)}
              placeholder="Search by name or phone…"
            />
            {patientResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-[#c1c7d1] rounded-lg shadow-lg overflow-hidden">
                {patientResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-[#f7f9fb] text-sm"
                    onClick={() => { setSelectedPatient(p); setPatientResults([]); setPatientSearch(""); }}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-[#414750] ml-2">{p.phoneNumber}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Appointment type */}
      <div className="space-y-1">
        <Label>Appointment Type <span className="text-[#414750] font-normal">(optional — leave blank for any)</span></Label>
        <Input
          value={appointmentType}
          onChange={(e) => setAppointmentType(e.target.value)}
          placeholder="e.g. Cleaning, Check-up, Whitening"
        />
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Preferred From <span className="text-[#414750] font-normal">(optional)</span></Label>
          <Input
            type="date"
            value={preferredDateFrom}
            onChange={(e) => setPreferredDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Preferred To <span className="text-[#414750] font-normal">(optional)</span></Label>
          <Input
            type="date"
            value={preferredDateTo}
            onChange={(e) => setPreferredDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Time preference */}
      <div className="space-y-1">
        <Label>Time of Day</Label>
        <Select value={timePreference} onValueChange={(v) => v && setTimePreference(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any time</SelectItem>
            <SelectItem value="morning">Morning (before noon)</SelectItem>
            <SelectItem value="afternoon">Afternoon (noon+)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label>Notes <span className="text-[#414750] font-normal">(optional)</span></Label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes for the receptionist"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Adding…" : "Add to Waitlist"}
        </Button>
      </div>
    </form>
  );
}

// ─── Inline booking form (avoids nested dialogs) ─────────────────────────────

function BookFromWaitlistForm({
  clinicId,
  patient,
  onClose,
}: {
  clinicId: string;
  patient: WaitlistEntry["patient"];
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [appointmentAt, setAppointmentAt] = useState("");
  const [appointmentType, setAppointmentType] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          appointmentAt,
          appointmentType,
          notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create appointment");
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Patient info (read-only) */}
      <div className="bg-[#f7f9fb] rounded-lg px-4 py-3 flex items-center gap-3">
        <span className="material-symbols-outlined text-[#004471] text-xl">person</span>
        <div>
          <p className="text-sm font-bold text-[#191c1e]">{patient.name}</p>
          <p className="text-xs text-[#414750]">{patient.phoneNumber}</p>
        </div>
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
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Booking…" : "Book & Send SMS"}
        </Button>
      </div>
    </form>
  );
}

// ─── Main WaitlistClient ──────────────────────────────────────────────────────

interface WaitlistClientProps {
  entries: WaitlistEntry[];
  clinicId: string;
  timezone: string;
}

export function WaitlistClient({ entries, clinicId, timezone }: WaitlistClientProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [bookPatient, setBookPatient] = useState<WaitlistEntry["patient"] | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function removeEntry(id: string) {
    setRemovingId(id);
    try {
      await fetch(`/api/waitlist/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setRemovingId(null);
    }
  }

  const active = entries.filter((e) => e.status !== "removed");

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>+ Add to Waitlist</Button>
      </div>

      {/* Table */}
      {active.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <span className="material-symbols-outlined text-4xl text-[#c1c7d1] block mb-2">queue</span>
          <p className="text-[#414750] text-sm">No patients on the waitlist.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#eceef0] text-xs font-bold uppercase tracking-wide text-[#414750]">
                <th className="px-5 py-3 text-left w-8">#</th>
                <th className="px-5 py-3 text-left">Patient</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Dates</th>
                <th className="px-5 py-3 text-left">Time</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Pending Offer</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceef0]">
              {active.map((entry, i) => {
                const pendingOffer = entry.offers.find((o) => o.status === "pending");
                const dateRange = formatDateRange(entry.preferredDateFrom, entry.preferredDateTo);

                return (
                  <tr key={entry.id} className="hover:bg-[#f7f9fb] transition-colors">
                    <td className="px-5 py-4 text-[#414750] font-mono text-xs">{i + 1}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#191c1e]">{entry.patient.name}</p>
                      <p className="text-xs text-[#414750]">{entry.patient.phoneNumber}</p>
                    </td>
                    <td className="px-5 py-4 text-[#414750]">
                      {entry.appointmentType ?? <span className="italic text-[#c1c7d1]">Any</span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-[#414750]">
                      {dateRange ?? <span className="italic text-[#c1c7d1]">Any</span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-[#414750] capitalize">
                      {entry.timePreference === "any" ? (
                        <span className="italic text-[#c1c7d1]">Any</span>
                      ) : entry.timePreference}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="px-5 py-4">
                      {pendingOffer ? (
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium text-[#191c1e]">
                            {formatOfferSlot(pendingOffer.offeredApptAt, timezone)}
                          </p>
                          <TimeRemaining expiresAt={pendingOffer.offerExpiresAt} />
                        </div>
                      ) : (
                        <span className="text-xs text-[#c1c7d1]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2 justify-end">
                        {entry.status === "waiting" || entry.status === "offered" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setBookPatient(entry.patient)}
                            className="text-[#004471] border-[#004471]/30 hover:bg-[#004471] hover:text-white text-xs"
                          >
                            Book Now
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeEntry(entry.id)}
                          disabled={removingId === entry.id}
                          className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                        >
                          {removingId === entry.id ? "…" : "Remove"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add to Waitlist modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Waitlist</DialogTitle>
          </DialogHeader>
          <AddToWaitlistModal onClose={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Book Now modal (pre-filled with waitlisted patient) */}
      {bookPatient && (
        <Dialog open={!!bookPatient} onOpenChange={(v) => { if (!v) setBookPatient(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Book Appointment</DialogTitle>
            </DialogHeader>
            <BookFromWaitlistForm
              clinicId={clinicId}
              patient={bookPatient}
              onClose={() => setBookPatient(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(from: string | null, to: string | null): string | null {
  if (!from && !to) return null;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `Until ${fmt(to)}`;
  return null;
}

function formatOfferSlot(dateStr: string, timezone: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
