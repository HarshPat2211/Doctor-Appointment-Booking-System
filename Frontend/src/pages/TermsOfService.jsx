export default function TermsOfService() {
  const sections = [
    {
      title: "Acceptance of Terms",
      body: "By using this platform, you agree to these terms and to comply with all applicable laws, policies, and responsible usage guidelines.",
    },
    {
      title: "Appointments and Responsibilities",
      body: "Users must provide accurate information, attend scheduled appointments on time, and maintain respectful communication across the platform.",
    },
    {
      title: "Accounts and Access",
      body: "You are responsible for account security and must not share credentials or allow unauthorized access to your profile.",
    },
    {
      title: "Platform Usage Rules",
      body: "Fraud, abuse, spam, or attempts to disrupt platform operations may result in account restrictions or permanent suspension.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl shadow-blue-100/50">
          <div className="border-b border-blue-100 bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 px-6 py-8 sm:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-200">Legal</p>
            <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">Terms of Service</h1>
            <p className="mt-2 text-sm text-sky-100">
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
                For terms related concerns, contact us at support@happyhealth.com.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}