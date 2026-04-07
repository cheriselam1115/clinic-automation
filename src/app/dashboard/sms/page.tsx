import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SmsActivityPage() {
  const clinicId = process.env.CLINIC_ID!;

  const logs = await prisma.smsLog.findMany({
    where: { clinicId },
    include: { patient: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">SMS Activity</h1>
        <p className="text-sm text-gray-500 mt-1">All inbound and outbound messages.</p>
      </div>

      {logs.length === 0 ? (
        <p className="text-gray-400 text-sm">No SMS activity yet.</p>
      ) : (
        <div className="bg-white rounded-lg border divide-y">
          {logs.map((log) => (
            <div key={log.id} className="px-5 py-4 flex items-start gap-4">
              <span
                className={`mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  log.direction === "inbound"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {log.direction === "inbound" ? "IN" : "OUT"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900">
                    {log.patient?.name ?? log.fromNumber}
                  </p>
                  <p className="text-xs text-gray-400">
                    {log.direction === "inbound" ? log.fromNumber : log.toNumber}
                  </p>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{log.body}</p>
              </div>
              <p className="text-xs text-gray-400 shrink-0">
                {new Date(log.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
