// Terms of Service. Required for Google OAuth branding verification and
// useful for setting expectations for an online game with accounts.

export function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h2 className="mb-1 text-2xl font-bold">Terms of Service</h2>
      <p className="mb-6 text-sm text-taupe">Last updated 15 September 2026.</p>

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-parchment/90">
        <section>
          <h3 className="mb-1 text-base font-semibold text-parchment">Using Outwit</h3>
          <p>
            Outwit is provided free of charge for personal, non-commercial play. By using it you agree
            to these terms. If you do not agree, please do not use the service.
          </p>
        </section>

        <section>
          <h3 className="mb-1 text-base font-semibold text-parchment">Your account</h3>
          <p>
            Accounts are optional. If you create one, keep access to your email secure. You are
            responsible for activity under your account. Choose a display name that is not offensive
            or misleading; we may remove names or accounts that abuse the service.
          </p>
        </section>

        <section>
          <h3 className="mb-1 text-base font-semibold text-parchment">Fair play</h3>
          <p>
            Do not disrupt games, harass other players, attempt to break or overload the service, or
            use it for anything unlawful. Games are casual; match results are recorded as played and
            are not a formal ranking.
          </p>
        </section>

        <section>
          <h3 className="mb-1 text-base font-semibold text-parchment">Availability</h3>
          <p>
            The service is provided "as is", without warranties. It runs on free hosting tiers, so it
            may be slow to wake, unavailable at times, or lose in-progress rooms when it restarts.
          </p>
        </section>

        <section>
          <h3 className="mb-1 text-base font-semibold text-parchment">Changes</h3>
          <p>
            We may update these terms or the service. Continued use after an update means you accept
            the new terms.
          </p>
        </section>

        <section>
          <h3 className="mb-1 text-base font-semibold text-parchment">Contact</h3>
          <p>
            Questions:{' '}
            <a className="text-accent hover:underline" href="mailto:hootinid@gmail.com">
              hootinid@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
