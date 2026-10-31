import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-3xl mx-auto bg-white/90 dark:bg-gray-800/90 rounded-2xl p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">
            Privacy Policy
          </h1>
          <Link
            to="/"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Back to Game
          </Link>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Effective date: 22 April 2026 &middot; Last updated: 22 April 2026
        </p>

        <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Who we are</h2>
            <p>
              Zed Rush (&ldquo;the app&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a free party word-guessing game
              published by the Developer, based in Zambia. For any privacy question or request, email{" "}
              <a className="text-blue-600 dark:text-blue-400 underline" href="mailto:joymwamba39@gmail.com">
                joymwamba39@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Short version</h2>
            <p>
              We do not ask you to create an account. We do not collect your name, email, phone number, location,
              contacts, photos, or device identifiers. We do not show ads. We do not use analytics or tracking SDKs.
              We do not sell or share your data with anyone.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">What the app does store</h2>
            <p className="mb-2">Two small things:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Team and player names you type in, and game scores.</strong> When you play a round, the team
                names, the player names you enter, round scores, and the date of the game are sent to our backend
                (Convex, hosted in the United States) so the app can show team history. These names are only whatever
                text you choose to type &mdash; the app never asks for real names and does not verify them. Please
                avoid entering sensitive information as a team or player name. Each record is tagged with a random ID
                the app creates on your device, so your teams and games are kept separate from other players&rsquo;
                and are never shown to anyone else. This ID is not linked to your name, phone, or any account.
              </li>
              <li>
                <strong>Technical information from your network request.</strong> Like any website, our backend
                provider may automatically log your IP address and user-agent string for a short period as part of
                normal server operation. We do not use this to identify or profile you.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">What stays on your device</h2>
            <p>
              Your theme preference (light / dark), a game in progress (so you can resume it), and cached app files
              for offline play are stored on your device only. They are never transmitted to us. Uninstalling the app clears them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Third parties</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Convex</strong> &mdash; our backend host (United States).{" "}
                <a className="text-blue-600 dark:text-blue-400 underline" href="https://www.convex.dev/legal/privacy" target="_blank" rel="noopener noreferrer">
                  Convex privacy policy
                </a>
              </li>
              <li>
                <strong>Google Play</strong> &mdash; the distribution store may collect install and crash data under
                its own policy.{" "}
                <a className="text-blue-600 dark:text-blue-400 underline" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                  Google privacy policy
                </a>
              </li>
              <li>
                <strong>Vercel</strong> &mdash; hosts our web app and may log basic request data.{" "}
                <a className="text-blue-600 dark:text-blue-400 underline" href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
                  Vercel privacy policy
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Retention and deletion</h2>
            <p>
              Team and game records stay in the backend until we delete them or until you ask us to. To request
              deletion of any data you believe relates to you, email the address above with enough detail (e.g., the
              team name) to locate it. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Your rights</h2>
            <p>
              Depending on where you live, you may have the right to access, correct, or delete any personal data we
              hold about you, to object to or restrict its processing, or to lodge a complaint with a data protection
              authority. For users in Zambia, that authority is the Office of the Data Protection Commissioner
              (dataprotection.gov.zm). For users in the EU/UK, it is your national data protection authority. Contact
              us first and we will try to resolve it directly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Children</h2>
            <p>
              Zed Rush is intended for players aged 13 and over. We do not knowingly collect personal data from
              children under 13. If you believe a child has entered data into the app, email us and we will remove
              anything we can identify.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">International users</h2>
            <p>
              Our backend is hosted in the United States, so team and game data you enter is transferred there. By
              using the app you consent to this transfer. We keep the data minimal and rely on our providers&rsquo;
              standard security measures (encryption in transit, restricted access).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">California residents</h2>
            <p>
              We are not a &ldquo;business&rdquo; as defined by the California Consumer Privacy Act (we fall below the
              revenue and user thresholds), and we do not sell or share personal information for cross-context
              behavioural advertising. California residents may still email us to make a privacy request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Changes to this policy</h2>
            <p>
              If we change this policy we will update the date at the top of this page. For significant changes we
              will also add a notice inside the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Contact</h2>
            <p>
              Developer &middot; Lusaka, Zambia &middot;{" "}
              <a className="text-blue-600 dark:text-blue-400 underline" href="mailto:joymwamba39@gmail.com">
                joymwamba39@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
