export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header>
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          Alerts
        </p>
        <h1 className="mt-1 text-2xl font-bold text-kal-text">Notifications</h1>
      </header>

      <section className="rounded-[1.25rem] border border-kal-border bg-kal-card kal-shadow-card p-6 text-center sm:p-8">
        <p className="text-lg font-semibold text-kal-text">No notifications yet</p>
        <p className="mt-2 text-sm text-kal-muted">
          Daily reminders and smart nudges are coming soon.
        </p>
      </section>
    </div>
  );
}
