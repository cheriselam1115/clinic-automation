"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Appointment, Patient } from "@prisma/client";

type AppointmentWithPatient = Appointment & { patient: Patient };

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  reschedule_requested: "bg-yellow-100 text-yellow-800",
  no_response: "bg-orange-100 text-orange-800",
};

export function AppointmentTable({
  appointments,
  timezone,
}: {
  appointments: AppointmentWithPatient[];
  timezone: string;
}) {
  if (appointments.length === 0) {
    return (
      <p className="text-gray-400 text-sm">No upcoming appointments.</p>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appt) => (
            <TableRow key={appt.id}>
              <TableCell className="font-medium">{appt.patient.name}</TableCell>
              <TableCell className="text-gray-500">{appt.patient.phoneNumber}</TableCell>
              <TableCell>
                {new Date(appt.appointmentAt).toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: timezone,
                })}
              </TableCell>
              <TableCell>{appt.appointmentType}</TableCell>
              <TableCell>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    STATUS_COLORS[appt.status] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {appt.status.replace(/_/g, " ")}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
