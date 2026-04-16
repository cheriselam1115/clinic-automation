import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/twilio";
import { twilioClient } from "@/lib/twilio";
import { processExpiredOffers } from "@/lib/waitlist";
import { reminderSms, receptionistNoResponseAlert, type Language } from "@/lib/sms-templates";
import { formatAppointmentDate } from "@/lib/format-date";

export async function POST(req: NextRequest) {
  // Validate cron secret — CRON_SECRET must always be set in production.
  // Fail closed: if the env var is missing, reject the request.
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const WINDOW_MINUTES = 15;
  // Reminders run for all clinics in a single cron pass
  const clinics = await prisma.clinic.findMany({ select: { id: true } });
  const results = await Promise.all(clinics.map((c) => processClinic(c.id, now, WINDOW_MINUTES)));
  const remindersSent = results.reduce((a, b) => a + b.remindersSent, 0);
  const noResponseFlagged = results.reduce((a, b) => a + b.noResponseFlagged, 0);
  const waitlistExpired = results.reduce((a, b) => a + (b.waitlistExpired ?? 0), 0);
  return Response.json({ success: true, remindersSent, noResponseFlagged, waitlistExpired, processedAt: now.toISOString() });
}

async function processClinic(clinicId: string, now: Date, WINDOW_MINUTES: number) {

  const [clinic, reminderConfigs] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: clinicId } }),
    prisma.reminderConfig.findMany({ where: { clinicId } }),
  ]);

  if (!clinic) return { remindersSent: 0, noResponseFlagged: 0 };

  let remindersSent = 0;
  let noResponseFlagged = 0;

  // === SEND DUE REMINDERS ===
  for (const config of reminderConfigs) {
    const windowStart = new Date(
      now.getTime() + config.hoursBefore * 60 * 60 * 1000 - WINDOW_MINUTES * 60 * 1000
    );
    const windowEnd = new Date(
      now.getTime() + config.hoursBefore * 60 * 60 * 1000 + WINDOW_MINUTES * 60 * 1000
    );

    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        status: { notIn: ["cancelled"] },
        appointmentAt: { gte: windowStart, lte: windowEnd },
        reminderLogs: {
          none: { reminderConfigId: config.id },
        },
      },
      include: { patient: true },
    });

    for (const appt of appointments) {
      try {
        const { appointmentDate, appointmentTime } = formatAppointmentDate(
          appt.appointmentAt,
          clinic.timezone
        );

        const smsBody = reminderSms(
          {
            patientName: appt.patient.name,
            clinicName: clinic.name,
            clinicPhone: clinic.alertPhoneNumber,
            appointmentDate,
            appointmentTime,
          },
          appt.patient.preferredLanguage as Language
        );

        const msg = await sendSms(appt.patient.phoneNumber, smsBody, appt.id);

        // Insert log — UNIQUE constraint prevents duplicates
        await prisma.reminderLog.create({
          data: {
            appointmentId: appt.id,
            reminderConfigId: config.id,
            twilioMessageSid: msg.sid,
          },
        });

        await prisma.smsLog.create({
          data: {
            clinicId,
            appointmentId: appt.id,
            patientId: appt.patientId,
            direction: "outbound",
            body: smsBody,
            fromNumber: clinic.phoneNumber,
            toNumber: appt.patient.phoneNumber,
            twilioMessageSid: msg.sid,
            status: msg.status,
          },
        });

        remindersSent++;
      } catch (err) {
        console.error(`Failed to send reminder for appointment ${appt.id}:`, err);
        // Don't insert log — will retry next cron run
      }
    }
  }

  // === FLAG NO-RESPONSE AT 24h MARK ===
  // Find appointments in 24h window where patient hasn't responded at all
  const noResponseWindowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000 - WINDOW_MINUTES * 60 * 1000);
  const noResponseWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000 + WINDOW_MINUTES * 60 * 1000);

  const unresponsiveAppts = await prisma.appointment.findMany({
    where: {
      clinicId,
      status: "scheduled", // still 'scheduled' means never confirmed/cancelled/rescheduled
      appointmentAt: { gte: noResponseWindowStart, lte: noResponseWindowEnd },
    },
    include: { patient: true },
  });

  for (const appt of unresponsiveAppts) {
    try {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { status: "no_response" },
      });

      const { appointmentDate, appointmentTime } = formatAppointmentDate(
        appt.appointmentAt,
        clinic.timezone
      );

      const alertMsg = receptionistNoResponseAlert(
        appt.patient.name,
        appt.patient.phoneNumber,
        appointmentDate,
        appointmentTime,
        clinic.name
      );

      await twilioClient.messages.create({
        to: clinic.alertPhoneNumber,
        from: clinic.phoneNumber,
        body: alertMsg,
      });

      noResponseFlagged++;
    } catch (err) {
      console.error(`Failed to flag no-response for appointment ${appt.id}:`, err);
    }
  }

  // Expire stale waitlist offers and cascade to next patient
  const { expiredCount: waitlistExpired } = await processExpiredOffers(clinicId, now);

  return { remindersSent, noResponseFlagged, waitlistExpired };
}
