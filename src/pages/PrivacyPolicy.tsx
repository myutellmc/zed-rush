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
          Effective date: 22 April 2026 &middot; Last updated: 31 October 2026
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
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">What the app stores</h2>
            <p>
              Everything the game needs stays on your device: the team and player names you type in, scores, a game
              in progress (so you can resume it), your theme preference (light / dark), and cached app files for
              offline play. None of it is sent to us or anyone else. Clearing the app&rsquo;s data or uninstalling the
              app deletes it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Technical information</h2>
            <p>
              Like any website, our hosting provider may automatically log your IP address and user-agent string for
              a short period when your device downloads the app&rsquo;s files. We do not use this to identify or
              profile you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Third parties</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Render</strong> &mdash; hosts our web app and may log basic request data.{" "}
                <a className="text-blue-600 dark:text-blue-400 underline" href="https://render.com/privacy" target="_blank" rel="noopener noreferrer">
                  Render privacy policy
                </a>
              </li>
              <li>
                <strong>Google Play</strong> &mdash; the distribution store may collect install and crash data under
                its own policy.{" "}
                <a className="text-blue-600 dark:text-blue-400 underline" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                  Google privacy policy
                </a>
              </li>
            </ul>
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
              Zed Rush is intended for players aged 13 and over. The app does not collect personal data from anyone,
              including children.
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
