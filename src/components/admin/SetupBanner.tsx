export default function SetupBanner() {
  return (
    <section className="sp-panel mb-8 border border-gold/50 p-6 sm:p-8">
      <p className="sp-eyebrow">One database step left</p>
      <p className="mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-taupe">
        The shop tables are already there. Open Supabase, go to SQL Editor, and run{" "}
        <span className="font-semibold text-burgundy">supabase/migrations/20261015000000_commerce_admin.sql</span> once.
        After that, saving a kit, updating an order, and the customer list all start working.
      </p>
    </section>
  );
}
