export default function PrivacyPolicy() {
  const sections = [
    {
      title: "Information We Collect",
      body: "We collect account details, appointment information, and basic usage data required to provide appointment booking and care management services.",
    },
    {
      title: "How We Use Data",
      body: "Data is used to manage bookings, send reminders and notifications, maintain records, and improve platform reliability and user experience.",
    },
    {
      title: "Data Security",
      body: "We apply reasonable technical and organizational safeguards to protect personal information from unauthorized access, disclosure, alteration, or misuse.",
    },
    {
      title: "Data Sharing",
      body: "We only share required information with authorized doctors, patients, and service providers needed to operate the platform securely and effectively.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl shadow-blue-100/50">
          <div className="border-b border-blue-100 bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 px-6 py-8 sm:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">Legal</p>
            <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">Privacy Policy</h1>
            <p className="mt-2 text-sm text-blue-100">
              Last updated: {new Date().toLocaleDateString("en-IN")}
            </p>
          </div>

          <div className="space-y-5 px-6 py-7 sm:px-10 sm:py-9">
            {sections.map((section, index) => (
              <section key={section.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <h2 className="text-lg font-bold text-slate-900">
                  {index + 1}. {section.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-700">{section.body}</p>
              </section>
            ))}

            <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
              <h2 className="text-lg font-bold text-blue-900">5. Contact</h2>
              <p className="mt-2 text-sm leading-7 text-blue-900">
                For privacy related questions, contact us at support@happyhealth.com.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}