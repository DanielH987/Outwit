// Privacy Policy. Required for Google OAuth branding verification (Google's
// consent screen links to it) and generally good practice for an app that
// stores accounts. Content must stay accurate if data practices change.

export function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h2 className="mb-1 text-2xl font-bold">Privacy Policy</h2>
      <p className="mb-6 text-sm text-taupe">Last updated 15 September 2026.</p>

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-parchment/90">
        <section>
          <h3 className="mb-1 text-base font-semibold text-parchment">What Outwit is</h3>
          <p>
            Outwit is a free, browser-based board game you can play alone (pass-and-play), online
            with a friend, or online with an optional account.
          </p>
        </section>

        <section>
          <h3 className="mb-1 text-base font-semibold text-parchment">What we store</h3>
          <ul className="list-disc pl-5">
            <li>
              <strong className="text-parchment">If you play as a guest:</strong> a random display name
              and a random device identifier are kept in your browser's local storage. Nothing is sent
              to us for safekeeping, and matches are not stored.
            </li>
            <li>
              <strong className="text-parchment">If you sign in:</strong> we store your email address
              (and, with Google sign-in, the basic profile information Google shares: your email
              address) plus your chosen display name, using Supabase Auth.
            </li>
            <li>
              <strong className="text-parchment">Game results:</strong> when a signed-in or guest player
              finishes an online game, we record the result — the two player identifiers, the display
              names, the winner, the reason the game ended, and the number of moves — so it can appear
              in your match history. We do not record the moves themselves.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-1 text-base font-semibold text-parchment">What we do not do</h3>
          <p>
            We do not sell your data, show advertising, or track you across other websites. We request
            only the scopes needed to sign you in (email address). Google user data is used solely to
            authenticate you.
          </p>
        </section>

        <section>
          <h3 className="mb-1 text-base font-semibold text-parchment">Service providers</h3>
          <ul className="list-disc pl-5">
            <li>Supabase (authentication and match history storage).</li>
            <li>Vercel (website hosting).</li>
            <li>Render (game server hosting).</li>
            <li>Google (optional sign-in with Google).</li>
          </ul>
        </section>

        <section>
          <h3 className="mb-1 text-base font-semibold text-parchment">Your choices</h3>
          <p>
            You can play without an account at any time. To delete your account and its stored data,
            email us at the address below and we will remove it.
          </p>
        </section>

        <section>
          <h3 className="mb-1 text-base font-semibold text-parchment">Contact</h3>
          <p>
            Questions or deletion requests:{' '}
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
