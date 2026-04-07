"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Appointment, Patient } from "@prisma/client";

type AppointmentWithPatient = Appointment & { patient: Patient };

const STATUS_LABELS: Record<string, string> = {
  reschedule_requested: "Wants to reschedule",
  no_response: "No response",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  reschedule_requested: "bg-yellow-100 text-yellow-800",
  no_response: "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-800",
};

export function CallQueueClient({
  appointments,
  timezone,
}: {
  appointments: AppointmentWithPatient[];
  timezone: string;
}) {
  const router = useRouter();
  const [handling, setHandling] = useState<string | null>(null);

  async function markHandled(apptId: string) {
    setHandling(apptId);
    await fetch(`/api/appointments/${apptId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    setHandling(null);
    router.refresh();
  }

  if (appointments.length === 0) {
    return (
      <p className="text-gray-400 text-sm">No patients in the call queue.</p>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appt) => (
        <div
          key={appt.id}
          className="bg-white border rounded-lg px-5 py-4 flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <p className="font-medium text-gray-900">{appt.patient.name}</p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  STATUS_COLORS[appt.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {STATUS_LABELS[appt.status] ?? appt.status}
              </span>
            </div>
            <p className="text-lg font-semibold text-blue-700">{appt.patient.phoneNumber}</p>
            <p className="text-xs text-gray-500">
              Appointment:{" "}
              {new Date(appt.appointmentAt).toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZone: timezone,
              })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={handling === appt.id}
            onClick={() => markHandled(appt.id)}
          >
            {handling === appt.id ? "Marking…" : "Mark as Handled"}
          </Button>
        </div>
      ))}
    </div>
  );
}
