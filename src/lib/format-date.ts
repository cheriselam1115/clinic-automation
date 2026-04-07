import { formatInTimeZone } from "date-fns-tz";

export function formatAppointmentDate(
  date: Date,
  timezone: string
): { appointmentDate: string; appointmentTime: string } {
  const appointmentDate = formatInTimeZone(date, timezone, "EEEE, MMMM d");
  const appointmentTime = formatInTimeZone(date, timezone, "h:mm a");
  return { appointmentDate, appointmentTime };
}
