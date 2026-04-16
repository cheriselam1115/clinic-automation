import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateTwilioSignature, twilioClient } from "@/lib/twilio";
import { parseSmsIntent } from "@/lib/sms-parser";
import {
  receptionistCancelAlert,
  receptionistRescheduleAlert,
  waitlistBookedSms,
  waitlistPassedSms,
  receptionistWaitlistBookedAlert,
  type Language,
} from "@/lib/sms-templates";
import { formatAppointmentDate } from "@/lib/format-date";
import { buildGoogleCalendarUrl, buildAppleCalendarUrl } from "@/lib/calendar";
import { offerNextWaitlistPatient } from "@/lib/waitlist";

// Twilio expects TwiML XML response
function twimlResponse(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
  return new Response(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = Object.fromEntries(new URLSearchParams(body));

  // Validate Twilio signature on every request — not just in production.
  // Skipped only when TWILIO_AUTH_TOKEN is absent (e.g. unit tests without Twilio).
  if (process.env.TWILIO_AUTH_TOKEN) {
    const signature = req.headers.get("x-twilio-signature") ?? "";
    const url = process.env.NEXT_PUBLIC_APP_URL + "/api/sms/inbound";
    const isValid = validateTwilioSignature(signature, url, params);
    if (!isValid) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const fromNumber = params.From;
  const toNumber = params.To;
  const messageBody = params.Body ?? "";

  // Find the clinic by Twilio number
  const clinic = await prisma.clinic.findFirst({
    where: { phoneNumber: toNumber },
  });

  if (!clinic) {
    return twimlResponse(
      "This number is not recognized. Please call the clinic directly."
    );
  }

  // Find the patient
  const patient = await prisma.patient.findUnique({
    where: { clinicId_phoneNumber: { clinicId: clinic.id, phoneNumber: fromNumber } },
  });

  // Log the inbound message
  await prisma.smsLog.create({
    data: {
      clinicId: clinic.id,
      patientId: patient?.id,
      direction: "inbound",
      body: messageBody,
      fromNumber,
      toNumber,
      status: "received",
    },
  });

  if (!patient) {
    return twimlResponse(
      "We don't recognize this number. Please call the clinic directly."
    );
  }

  // Find the patient's next upcoming appointment
  const appointment = await prisma.appointment.findFirst({
    where: {
      clinicId: clinic.id,
      patientId: patient.id,
      status: { in: ["scheduled", "confirmed", "no_response"] },
      appointmentAt: { gte: new Date() },
    },
    orderBy: { appointmentAt: "asc" },
  });

  if (!appointment) {
    const reply =
      patient.preferredLanguage === "zh-TW" || patient.preferredLanguage === "yue"
        ? "我們找不到您即將到來的預約。如有疑問，請致電診所。"
        : "We couldn't find an upcoming appointment for you. Please call the clinic.";
    return twimlResponse(reply);
  }

  // ─── Layer 1: pending waitlist offers ──────────────────────────────────────
  const now = new Date();
  const pendingOffers = await prisma.waitlistOffer.findMany({
    where: {
      waitlistEntry: { patientId: patient.id, clinicId: clinic.id },
      status: "pending",
      offerExpiresAt: { gt: now },
    },
    include: { waitlistEntry: true },
    orderBy: { offeredApptAt: "asc" }, // earliest slot first
  });

  if (pendingOffers.length > 0) {
    const offerIntent = parseSmsIntent(messageBody);
    const lang = patient.preferredLanguage as Language;
    const { appointmentDate: offerDate, appointmentTime: offerTime } =
      formatAppointmentDate(pendingOffers[0].offeredApptAt, clinic.timezone);

    if (offerIntent.type === "confirm") {
      const winner = pendingOffers[0]; // earliest slot
      const apptType = winner.offeredApptType ?? "appointment";

      // Create the appointment for this patient
      const newAppt = await prisma.appointment.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          appointmentAt: winner.offeredApptAt,
          appointmentType: apptType,
          status: "scheduled",
        },
      });

      // Accept winner, decline all other pending offers for this patient
      await prisma.waitlistOffer.updateMany({
        where: {
          waitlistEntry: { patientId: patient.id },
          status: "pending",
        },
        data: { status: "declined" },
      });
      await prisma.waitlistOffer.update({
        where: { id: winner.id },
        data: { status: "accepted" },
      });

      // Mark the waitlist entry as booked
      await prisma.waitlistEntry.update({
        where: { id: winner.waitlistEntryId },
        data: { status: "booked" },
      });

      // Build calendar URLs
      const googleUrl = buildGoogleCalendarUrl({
        appointmentId: newAppt.id,
        patientName: patient.name,
        clinicName: clinic.name,
        clinicAddress: clinic.address,
        appointmentAt: winner.offeredApptAt,
      });
      const appleUrl = buildAppleCalendarUrl(newAppt.id);

      const bookedBody = waitlistBookedSms(
        {
          patientName: patient.name,
          clinicName: clinic.name,
          apptDate: offerDate,
          apptTime: offerTime,
          apptType,
          googleCalendarUrl: googleUrl,
          appleCalendarUrl: appleUrl,
        },
        lang
      );

      // Send booked confirmation to patient
      await prisma.smsLog.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          appointmentId: newAppt.id,
          direction: "outbound",
          body: bookedBody,
          fromNumber: toNumber,
          toNumber: fromNumber,
          status: "sent",
        },
      });

      // Alert receptionist
      try {
        const alertBody = receptionistWaitlistBookedAlert(
          patient.name,
          patient.phoneNumber,
          offerDate,
          offerTime,
          apptType,
          clinic.name
        );
        await twilioClient.messages.create({
          to: clinic.alertPhoneNumber,
          from: clinic.phoneNumber,
          body: alertBody,
        });
      } catch (err) {
        console.error("Failed to send waitlist booked alert:", err);
      }

      return twimlResponse(bookedBody);

    } else if (offerIntent.type === "cancel") {
      // Decline the most recent pending offer, cascade to next in queue
      const latest = pendingOffers[pendingOffers.length - 1];
      await prisma.waitlistOffer.update({
        where: { id: latest.id },
        data: { status: "declined" },
      });

      // Cascade
      if (latest.cancelledApptId && latest.offeredApptAt) {
        await offerNextWaitlistPatient(
          {
            id: latest.cancelledApptId,
            clinicId: clinic.id,
            appointmentType: latest.offeredApptType,
            appointmentAt: latest.offeredApptAt,
          },
          {
            id: clinic.id,
            name: clinic.name,
            phoneNumber: clinic.phoneNumber,
            alertPhoneNumber: clinic.alertPhoneNumber,
            timezone: clinic.timezone,
          }
        );
      }

      const passedBody = waitlistPassedSms(lang);
      await prisma.smsLog.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          direction: "outbound",
          body: passedBody,
          fromNumber: toNumber,
          toNumber: fromNumber,
          status: "sent",
        },
      });
      return twimlResponse(passedBody);

    } else {
      // Unknown intent while offer is pending — nudge them
      const nudge =
        lang === "zh-TW" || lang === "yue"
          ? `回覆 1 預約 ${offerDate} ${offerTime} 的空缺，或回覆 2 放棄。`
          : `Reply 1 to book the ${offerDate} at ${offerTime} slot, or 2 to pass.`;
      return twimlResponse(nudge);
    }
  }
  // ─── End Layer 1 ───────────────────────────────────────────────────────────

  const intent = parseSmsIntent(messageBody);
  const lang = patient.preferredLanguage as Language;
  const { appointmentDate, appointmentTime } = formatAppointmentDate(
    appointment.appointmentAt,
    clinic.timezone
  );

  let replyMessage: string;
  let newStatus: string | null = null;
  let alertMessage: string | null = null;

  switch (intent.type) {
    case "confirm":
      newStatus = "confirmed";
      replyMessage =
        lang === "zh-TW"
          ? `感謝您！您在 ${appointmentDate} ${appointmentTime} 的預約已確認。期待見到您。`
          : lang === "yue"
          ? `多謝您！您喺 ${appointmentDate} ${appointmentTime} 嘅預約已確認。期待見到您。`
          : `Thank you! Your appointment on ${appointmentDate} at ${appointmentTime} is confirmed. See you then!`;
      break;

    case "cancel":
      newStatus = "cancelled";
      // Trigger waitlist offer for this freed slot (after status update below)
      replyMessage =
        lang === "zh-TW"
          ? `您的預約已取消。如需重新預約，請致電 ${clinic.alertPhoneNumber}。`
          : lang === "yue"
          ? `您嘅預約已取消。如需重新預約，請致電 ${clinic.alertPhoneNumber}。`
          : `Your appointment has been cancelled. Please call us at ${clinic.alertPhoneNumber} to rebook.`;
      alertMessage = receptionistCancelAlert(
        patient.name,
        patient.phoneNumber,
        appointmentDate,
        appointmentTime,
        clinic.name
      );
      break;

    case "reschedule":
      newStatus = "reschedule_requested";
      replyMessage =
        lang === "zh-TW"
          ? `我們已記錄您的改期請求。我們的接待員將盡快致電您安排新時間。`
          : lang === "yue"
          ? `我們已記錄您嘅改期請求。我們嘅接待員將盡快致電您安排新時間。`
          : `We've noted your request to reschedule. A receptionist will call you shortly to find a new time.`;
      alertMessage = receptionistRescheduleAlert(
        patient.name,
        patient.phoneNumber,
        appointmentDate,
        appointmentTime,
        clinic.name
      );
      break;

    default:
      replyMessage =
        lang === "zh-TW" || lang === "yue"
          ? `我們已收到您的訊息。如有疑問，請致電診所。`
          : `We received your message. For questions please call the clinic directly.`;
  }

  // Update appointment status
  if (newStatus) {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: newStatus },
    });

    // When a patient cancels via SMS, offer the freed slot to the waitlist
    if (newStatus === "cancelled") {
      try {
        await offerNextWaitlistPatient(
          {
            id: appointment.id,
            clinicId: clinic.id,
            appointmentType: appointment.appointmentType,
            appointmentAt: appointment.appointmentAt,
          },
          {
            id: clinic.id,
            name: clinic.name,
            phoneNumber: clinic.phoneNumber,
            alertPhoneNumber: clinic.alertPhoneNumber,
            timezone: clinic.timezone,
          }
        );
      } catch (err) {
        console.error("Failed to trigger waitlist offer on SMS cancel:", err);
      }
    }
  }

  // Send alert to receptionist
  if (alertMessage && clinic.alertPhoneNumber) {
    try {
      await twilioClient.messages.create({
        to: clinic.alertPhoneNumber,
        from: clinic.phoneNumber,
        body: alertMessage,
      });
    } catch (err) {
      console.error("Failed to send receptionist alert:", err);
    }
  }

  // Log the outbound reply
  await prisma.smsLog.create({
    data: {
      clinicId: clinic.id,
      appointmentId: appointment.id,
      patientId: patient.id,
      direction: "outbound",
      body: replyMessage,
      fromNumber: toNumber,
      toNumber: fromNumber,
      status: "sent",
    },
  });

  return twimlResponse(replyMessage);
}
