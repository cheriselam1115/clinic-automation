export type Language = "en" | "zh-TW" | "yue";

interface AppointmentInfo {
  patientName: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  appointmentDate: string; // e.g. "Monday, April 7"
  appointmentTime: string; // e.g. "2:30 PM"
  googleCalendarUrl: string;
  appleCalendarUrl: string;
}

export function confirmationSms(info: AppointmentInfo, lang: Language): string {
  switch (lang) {
    case "zh-TW":
      return `您好 ${info.patientName}，您在${info.clinicName}的預約已確認：${info.appointmentDate} ${info.appointmentTime}。
📍 ${info.clinicAddress} | 📞 ${info.clinicPhone}
請提早10分鐘到達。
加入 Google 日曆：${info.googleCalendarUrl}
加入 Apple 日曆：${info.appleCalendarUrl}
回覆 1 確認，2 取消，或 28 改期。`;

    case "yue":
      return `你好 ${info.patientName}，你喺${info.clinicName}嘅預約已確認：${info.appointmentDate} ${info.appointmentTime}。
📍 ${info.clinicAddress} | 📞 ${info.clinicPhone}
請早10分鐘到達。
加入 Google 日曆：${info.googleCalendarUrl}
加入 Apple 日曆：${info.appleCalendarUrl}
回覆 1 確認，2 取消，或 28 改期。`;

    default: // en
      return `Hi ${info.patientName}, your appointment at ${info.clinicName} is confirmed for ${info.appointmentDate} at ${info.appointmentTime}.
📍 ${info.clinicAddress} | 📞 ${info.clinicPhone}
Please arrive 10 minutes early.
Add to Google Calendar: ${info.googleCalendarUrl}
Add to Apple Calendar: ${info.appleCalendarUrl}
Reply 1 to confirm, 2 to cancel, or 28 to reschedule.`;
  }
}

export function reminderSms(
  info: Pick<AppointmentInfo, "patientName" | "clinicName" | "clinicPhone" | "appointmentDate" | "appointmentTime">,
  lang: Language
): string {
  switch (lang) {
    case "zh-TW":
      return `${info.patientName} 您好，提醒您在${info.clinicName}有預約：${info.appointmentDate} ${info.appointmentTime}。
📞 ${info.clinicPhone}
回覆 1 確認，2 取消，或 28 改期。`;

    case "yue":
      return `${info.patientName} 你好，提醒你喺${info.clinicName}有預約：${info.appointmentDate} ${info.appointmentTime}。
📞 ${info.clinicPhone}
回覆 1 確認，2 取消，或 28 改期。`;

    default: // en
      return `Hi ${info.patientName}, reminder: you have an appointment at ${info.clinicName} on ${info.appointmentDate} at ${info.appointmentTime}.
📞 ${info.clinicPhone}
Reply 1 to confirm, 2 to cancel, or 28 to reschedule.`;
  }
}

export function receptionistCancelAlert(
  patientName: string,
  patientPhone: string,
  appointmentDate: string,
  appointmentTime: string,
  clinicName: string
): string {
  return `[${clinicName}] ${patientName} (${patientPhone}) has CANCELLED their appointment on ${appointmentDate} at ${appointmentTime}.`;
}

export function receptionistRescheduleAlert(
  patientName: string,
  patientPhone: string,
  appointmentDate: string,
  appointmentTime: string,
  clinicName: string
): string {
  return `[${clinicName}] ${patientName} (${patientPhone}) wants to RESCHEDULE their appointment on ${appointmentDate} at ${appointmentTime}. Please call them back.`;
}

// ─── Waitlist templates ───────────────────────────────────────────────────────

interface WaitlistOfferInfo {
  patientName: string;
  clinicName: string;
  apptDate: string;
  apptTime: string;
  apptType: string;
}

interface WaitlistBookedInfo extends WaitlistOfferInfo {
  googleCalendarUrl: string;
  appleCalendarUrl: string;
}

interface WaitlistJoinedInfo {
  clinicName: string;
  appointmentType: string | null;
  timePreference: string; // "any" | "morning" | "afternoon"
}

function formatTimePreference(pref: string, lang: Language): string {
  if (lang === "en") {
    if (pref === "morning") return "morning";
    if (pref === "afternoon") return "afternoon";
    return "any time";
  }
  if (lang === "zh-TW" || lang === "yue") {
    if (pref === "morning") return "上午";
    if (pref === "afternoon") return "下午";
    return "任何時段";
  }
  return pref;
}

/** Sent when receptionist adds a patient to the waitlist. */
export function waitlistJoinedSms(info: WaitlistJoinedInfo, lang: Language): string {
  const type = info.appointmentType ?? (lang === "en" ? "any type" : "任何類型");
  const timePref = formatTimePreference(info.timePreference, lang);
  switch (lang) {
    case "zh-TW":
      return `您好！您已被加入${info.clinicName}的等候名單（${type}，${timePref}）。有空缺時我們會立即通知您。`;
    case "yue":
      return `你好！你已被加入${info.clinicName}嘅等候名單（${type}，${timePref}）。有空缺時我哋會即時通知你。`;
    default:
      return `Hi! You've been added to the waitlist at ${info.clinicName} for ${type} appointments (${timePref}). We'll text you as soon as a slot opens up.`;
  }
}

/** Sent when a matching slot opens and is offered to a waitlisted patient. */
export function waitlistOfferSms(info: WaitlistOfferInfo, lang: Language): string {
  switch (lang) {
    case "zh-TW":
      return `好消息！${info.clinicName}有一個${info.apptType}預約空缺：${info.apptDate} ${info.apptTime}。
回覆 1（是）預約，或 2（否）放棄。此邀請將在2小時後失效。`;
    case "yue":
      return `好消息！${info.clinicName}有一個${info.apptType}預約空缺：${info.apptDate} ${info.apptTime}。
回覆 1（係）預約，或 2（唔係）放棄。此邀請將喺2小時後失效。`;
    default:
      return `Good news, ${info.patientName}! A ${info.apptType} slot just opened at ${info.clinicName} on ${info.apptDate} at ${info.apptTime}.
Reply 1 (YES) to book it or 2 (NO) to pass. Offer expires in 2 hours.`;
  }
}

/** Sent when patient accepts the waitlist offer and is booked. */
export function waitlistBookedSms(info: WaitlistBookedInfo, lang: Language): string {
  switch (lang) {
    case "zh-TW":
      return `您已成功預約${info.clinicName}的${info.apptType}：${info.apptDate} ${info.apptTime}。
加入 Google 日曆：${info.googleCalendarUrl}
加入 Apple 日曆：${info.appleCalendarUrl}
回覆 1 確認，2 取消，或 28 改期。`;
    case "yue":
      return `你已成功預約${info.clinicName}嘅${info.apptType}：${info.apptDate} ${info.apptTime}。
加入 Google 日曆：${info.googleCalendarUrl}
加入 Apple 日曆：${info.appleCalendarUrl}
回覆 1 確認，2 取消，或 28 改期。`;
    default:
      return `You're booked! Your ${info.apptType} appointment at ${info.clinicName} is confirmed for ${info.apptDate} at ${info.apptTime}.
Add to Google Calendar: ${info.googleCalendarUrl}
Add to Apple Calendar: ${info.appleCalendarUrl}
Reply 1 to confirm, 2 to cancel, or 28 to reschedule.`;
  }
}

/** Sent when patient replies NO to a waitlist offer. */
export function waitlistPassedSms(lang: Language): string {
  switch (lang) {
    case "zh-TW":
      return `沒問題！您仍在等候名單上，有新空缺時我們會再通知您。`;
    case "yue":
      return `冇問題！你仍喺等候名單上，有新空缺時我哋會再通知你。`;
    default:
      return `No worries! You're still on our waitlist. We'll reach out if another slot opens up.`;
  }
}

/** Alert to receptionist when a waitlist patient books a slot. */
export function receptionistWaitlistBookedAlert(
  patientName: string,
  patientPhone: string,
  apptDate: string,
  apptTime: string,
  apptType: string,
  clinicName: string
): string {
  return `[${clinicName}] WAITLIST BOOKED: ${patientName} (${patientPhone}) accepted the ${apptType} slot on ${apptDate} at ${apptTime}. Appointment created automatically.`;
}

/** Alert to receptionist when no one on the waitlist accepts an offered slot. */
export function receptionistNoWaitlistTakersAlert(
  clinicName: string,
  apptDate: string,
  apptTime: string,
  apptType: string
): string {
  return `[${clinicName}] WAITLIST: No one accepted the ${apptType} slot on ${apptDate} at ${apptTime}. Available for manual booking.`;
}

// ─── End waitlist templates ───────────────────────────────────────────────────

export function receptionistNoResponseAlert(
  patientName: string,
  patientPhone: string,
  appointmentDate: string,
  appointmentTime: string,
  clinicName: string
): string {
  return `[${clinicName}] ${patientName} (${patientPhone}) has NOT responded. Their appointment is ${appointmentDate} at ${appointmentTime}. Please call to confirm.`;
}
