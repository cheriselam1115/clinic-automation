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

export function receptionistNoResponseAlert(
  patientName: string,
  patientPhone: string,
  appointmentDate: string,
  appointmentTime: string,
  clinicName: string
): string {
  return `[${clinicName}] ${patientName} (${patientPhone}) has NOT responded. Their appointment is ${appointmentDate} at ${appointmentTime}. Please call to confirm.`;
}
