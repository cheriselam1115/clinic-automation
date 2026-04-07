import ical from "ical-generator";

interface CalendarEventInfo {
  appointmentId: string;
  patientName: string;
  clinicName: string;
  clinicAddress: string;
  appointmentAt: Date; // UTC
  durationMinutes?: number;
}

export function buildGoogleCalendarUrl(info: CalendarEventInfo): string {
  const start = formatDateForGoogle(info.appointmentAt);
  const end = formatDateForGoogle(
    new Date(info.appointmentAt.getTime() + (info.durationMinutes ?? 60) * 60 * 1000)
  );

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Appointment at ${info.clinicName}`,
    dates: `${start}/${end}`,
    details: `Your appointment at ${info.clinicName}`,
    location: info.clinicAddress,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildAppleCalendarUrl(appointmentId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${appUrl}/api/calendar/${appointmentId}`;
}

export function generateIcsContent(info: CalendarEventInfo): string {
  const calendar = ical({ name: info.clinicName });

  calendar.createEvent({
    id: info.appointmentId,
    start: info.appointmentAt,
    end: new Date(
      info.appointmentAt.getTime() + (info.durationMinutes ?? 60) * 60 * 1000
    ),
    summary: `Appointment at ${info.clinicName}`,
    description: `Your appointment at ${info.clinicName}`,
    location: info.clinicAddress,
  });

  return calendar.toString();
}

function formatDateForGoogle(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
