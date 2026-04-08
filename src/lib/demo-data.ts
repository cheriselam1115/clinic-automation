export const DEMO_CLINIC_ID = "demo-ntd";

export const DEMO_CLINIC = {
  id: DEMO_CLINIC_ID,
  name: "North Taunton Dental",
  logoUrl: null,
  timezone: "America/Toronto",
  phoneNumber: "+16471234567",
  alertPhoneNumber: "+16479876543",
  address: "North Taunton, ON",
};

const d = (daysAhead: number, h: number, m = 0) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + daysAhead);
  dt.setHours(h, m, 0, 0);
  return dt;
};

export const DEMO_APPOINTMENTS = [
  { id: "a1", patient: { id: "p1", name: "Sarah Mitchell", phone: "+16471110001" }, appointmentAt: d(0, 9, 0),  appointmentType: "Cleaning",      status: "confirmed",           patientId: "p1", clinicId: DEMO_CLINIC_ID, createdAt: new Date(), updatedAt: new Date(), notes: null, reminderSentAt: new Date() },
  { id: "a2", patient: { id: "p2", name: "James Okafor",   phone: "+16471110002" }, appointmentAt: d(0, 10, 30), appointmentType: "X-Ray",         status: "scheduled",           patientId: "p2", clinicId: DEMO_CLINIC_ID, createdAt: new Date(), updatedAt: new Date(), notes: null, reminderSentAt: null },
  { id: "a3", patient: { id: "p3", name: "Linda Pham",     phone: "+16471110003" }, appointmentAt: d(0, 11, 0),  appointmentType: "Consultation",  status: "confirmed",           patientId: "p3", clinicId: DEMO_CLINIC_ID, createdAt: new Date(), updatedAt: new Date(), notes: null, reminderSentAt: new Date() },
  { id: "a4", patient: { id: "p4", name: "David Ferreira", phone: "+16471110004" }, appointmentAt: d(0, 13, 0),  appointmentType: "Filling",       status: "reschedule_requested", patientId: "p4", clinicId: DEMO_CLINIC_ID, createdAt: new Date(), updatedAt: new Date(), notes: null, reminderSentAt: new Date() },
  { id: "a5", patient: { id: "p5", name: "Amy Chen",       phone: "+16471110005" }, appointmentAt: d(0, 14, 30), appointmentType: "Cleaning",      status: "no_response",         patientId: "p5", clinicId: DEMO_CLINIC_ID, createdAt: new Date(), updatedAt: new Date(), notes: null, reminderSentAt: new Date() },
  { id: "a6", patient: { id: "p6", name: "Marcus Reid",    phone: "+16471110006" }, appointmentAt: d(1, 9, 30),  appointmentType: "Root Canal",    status: "confirmed",           patientId: "p6", clinicId: DEMO_CLINIC_ID, createdAt: new Date(), updatedAt: new Date(), notes: null, reminderSentAt: new Date() },
  { id: "a7", patient: { id: "p7", name: "Priya Sharma",   phone: "+16471110007" }, appointmentAt: d(1, 11, 0),  appointmentType: "Whitening",     status: "scheduled",           patientId: "p7", clinicId: DEMO_CLINIC_ID, createdAt: new Date(), updatedAt: new Date(), notes: null, reminderSentAt: null },
  { id: "a8", patient: { id: "p8", name: "Tom Nguyen",     phone: "+16471110008" }, appointmentAt: d(2, 10, 0),  appointmentType: "Extraction",    status: "scheduled",           patientId: "p8", clinicId: DEMO_CLINIC_ID, createdAt: new Date(), updatedAt: new Date(), notes: null, reminderSentAt: null },
  { id: "a9", patient: { id: "p9", name: "Claire Dubois",  phone: "+16471110009" }, appointmentAt: d(3, 14, 0),  appointmentType: "Check-up",      status: "no_response",         patientId: "p9", clinicId: DEMO_CLINIC_ID, createdAt: new Date(), updatedAt: new Date(), notes: null, reminderSentAt: new Date() },
];

const ago = (mins: number) => new Date(Date.now() - mins * 60 * 1000);

export const DEMO_SMS_LOGS = [
  { id: "s1", direction: "outbound", patient: { name: "David Ferreira" }, fromNumber: "+16471234567", toNumber: "+16471110004", body: "Hi David, reminder for your Filling appointment tomorrow at 1:00 PM. Reply YES to confirm or NO to reschedule.", createdAt: ago(10) },
  { id: "s2", direction: "inbound",  patient: { name: "David Ferreira" }, fromNumber: "+16471110004", toNumber: "+16471234567", body: "Can we reschedule? Something came up.", createdAt: ago(7) },
  { id: "s3", direction: "outbound", patient: { name: "Amy Chen" },       fromNumber: "+16471234567", toNumber: "+16471110005", body: "Hi Amy, reminder for your Cleaning appointment today at 2:30 PM. Reply YES to confirm or NO to reschedule.", createdAt: ago(45) },
  { id: "s4", direction: "outbound", patient: { name: "Sarah Mitchell" }, fromNumber: "+16471234567", toNumber: "+16471110001", body: "Hi Sarah, reminder for your Cleaning appointment today at 9:00 AM. Reply YES to confirm or NO to reschedule.", createdAt: ago(120) },
  { id: "s5", direction: "inbound",  patient: { name: "Sarah Mitchell" }, fromNumber: "+16471110001", toNumber: "+16471234567", body: "YES", createdAt: ago(115) },
  { id: "s6", direction: "outbound", patient: { name: "Linda Pham" },     fromNumber: "+16471234567", toNumber: "+16471110003", body: "Hi Linda, reminder for your Consultation today at 11:00 AM. Reply YES to confirm or NO to reschedule.", createdAt: ago(180) },
  { id: "s7", direction: "inbound",  patient: { name: "Linda Pham" },     fromNumber: "+16471110003", toNumber: "+16471234567", body: "Yes confirmed, see you then!", createdAt: ago(175) },
];

export const DEMO_CALL_QUEUE = DEMO_APPOINTMENTS.filter(
  (a) => ["reschedule_requested", "no_response"].includes(a.status)
);
