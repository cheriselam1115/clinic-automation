import { toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/twilio";
import { twilioClient } from "@/lib/twilio";
import { formatAppointmentDate } from "@/lib/format-date";
import {
  waitlistOfferSms,
  receptionistNoWaitlistTakersAlert,
  type Language,
} from "@/lib/sms-templates";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlotInfo {
  id: string;
  clinicId: string;
  appointmentType: string | null;
  appointmentAt: Date;
}

interface ClinicInfo {
  id: string;
  name: string;
  phoneNumber: string;
  alertPhoneNumber: string;
  timezone: string;
}

// ─── Core: offer the next matching patient ────────────────────────────────────

/**
 * Find the first waitlisted patient who matches this cancelled slot
 * (type + date range + time preference), create a WaitlistOffer, and send them
 * an SMS. Returns true if an offer was sent, false if the list is exhausted
 * (in which case the receptionist is alerted).
 */
export async function offerNextWaitlistPatient(
  slot: SlotInfo,
  clinic: ClinicInfo
): Promise<boolean> {
  // Fetch all eligible waiting entries (type match or "any", not already offered/declined this slot)
  const entries = await prisma.waitlistEntry.findMany({
    where: {
      clinicId: clinic.id,
      status: "waiting",
      OR: [
        { appointmentType: slot.appointmentType },
        { appointmentType: null },
      ],
      offers: {
        none: {
          cancelledApptId: slot.id,
          status: { in: ["pending", "accepted", "declined"] },
        },
      },
    },
    include: { patient: true },
    orderBy: { createdAt: "asc" },
  });

  // Filter by date range and time preference in JS (needs timezone conversion)
  const localDate = toZonedTime(slot.appointmentAt, clinic.timezone);
  const slotHour = localDate.getHours();
  // Build a plain Date for date-only comparison (midnight of the slot's local day)
  const slotDateOnly = new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate()
  );

  const eligible = entries.filter((e) => {
    // Time preference
    if (e.timePreference === "morning" && slotHour >= 12) return false;
    if (e.timePreference === "afternoon" && slotHour < 12) return false;

    // Date range (compare against clinic-local date)
    if (e.preferredDateFrom) {
      const fromLocal = toZonedTime(e.preferredDateFrom, clinic.timezone);
      const fromDateOnly = new Date(
        fromLocal.getFullYear(),
        fromLocal.getMonth(),
        fromLocal.getDate()
      );
      if (slotDateOnly < fromDateOnly) return false;
    }
    if (e.preferredDateTo) {
      const toLocal = toZonedTime(e.preferredDateTo, clinic.timezone);
      const toDateOnly = new Date(
        toLocal.getFullYear(),
        toLocal.getMonth(),
        toLocal.getDate()
      );
      if (slotDateOnly > toDateOnly) return false;
    }

    return true;
  });

  // List exhausted — alert receptionist
  if (eligible.length === 0) {
    const { appointmentDate, appointmentTime } = formatAppointmentDate(
      slot.appointmentAt,
      clinic.timezone
    );
    try {
      await twilioClient.messages.create({
        to: clinic.alertPhoneNumber,
        from: clinic.phoneNumber,
        body: receptionistNoWaitlistTakersAlert(
          clinic.name,
          appointmentDate,
          appointmentTime,
          slot.appointmentType ?? "appointment"
        ),
      });
    } catch (err) {
      console.error("Failed to send no-waitlist-takers alert:", err);
    }
    return false;
  }

  const entry = eligible[0];
  const offerExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

  // Create the offer record
  await prisma.waitlistOffer.create({
    data: {
      waitlistEntryId: entry.id,
      clinicId: clinic.id,
      offeredApptAt: slot.appointmentAt,
      offeredApptType: slot.appointmentType,
      cancelledApptId: slot.id,
      offerExpiresAt,
    },
  });

  // Send SMS to patient
  const { appointmentDate, appointmentTime } = formatAppointmentDate(
    slot.appointmentAt,
    clinic.timezone
  );
  const smsBody = waitlistOfferSms(
    {
      patientName: entry.patient.name,
      clinicName: clinic.name,
      apptDate: appointmentDate,
      apptTime: appointmentTime,
      apptType: slot.appointmentType ?? "appointment",
    },
    entry.patient.preferredLanguage as Language
  );

  try {
    const msg = await sendSms(entry.patient.phoneNumber, smsBody);
    await prisma.smsLog.create({
      data: {
        clinicId: clinic.id,
        patientId: entry.patientId,
        direction: "outbound",
        body: smsBody,
        fromNumber: clinic.phoneNumber,
        toNumber: entry.patient.phoneNumber,
        twilioMessageSid: msg.sid,
        status: msg.status,
      },
    });
  } catch (err) {
    console.error("Failed to send waitlist offer SMS:", err);
    // Don't block — offer is created, patient can still respond if SMS delivers late
  }

  return true;
}

// ─── Cron: expire stale offers and cascade ────────────────────────────────────

export async function processExpiredOffers(
  clinicId: string,
  now: Date
): Promise<{ expiredCount: number }> {
  const expired = await prisma.waitlistOffer.findMany({
    where: {
      clinicId,
      status: "pending",
      offerExpiresAt: { lt: now },
    },
    include: {
      waitlistEntry: {
        include: { patient: true },
      },
    },
  });

  if (expired.length === 0) return { expiredCount: 0 };

  // Fetch clinic once
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) return { expiredCount: 0 };

  const clinicInfo: ClinicInfo = {
    id: clinic.id,
    name: clinic.name,
    phoneNumber: clinic.phoneNumber,
    alertPhoneNumber: clinic.alertPhoneNumber,
    timezone: clinic.timezone,
  };

  for (const offer of expired) {
    await prisma.waitlistOffer.update({
      where: { id: offer.id },
      data: { status: "expired" },
    });

    // Re-offer to next person in queue
    if (offer.cancelledApptId && offer.offeredApptAt) {
      await offerNextWaitlistPatient(
        {
          id: offer.cancelledApptId,
          clinicId,
          appointmentType: offer.offeredApptType,
          appointmentAt: offer.offeredApptAt,
        },
        clinicInfo
      );
    }
  }

  return { expiredCount: expired.length };
}

// ─── Auto-remove when regular appointment booked ──────────────────────────────

/**
 * When the receptionist books a regular appointment for a patient,
 * silently remove them from the waitlist (no SMS — they already got
 * the standard confirmationSms).
 */
export async function autoRemoveFromWaitlist(
  patientId: string,
  clinicId: string,
  appointmentType: string | null
): Promise<void> {
  await prisma.waitlistEntry.updateMany({
    where: {
      patientId,
      clinicId,
      status: { in: ["waiting", "offered"] },
      OR: [
        { appointmentType: appointmentType },
        { appointmentType: null },
      ],
    },
    data: { status: "removed" },
  });
}
