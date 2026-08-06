import React, { useEffect } from "react";
import "../PrivacyPolicy/PrivacyPolicy.css";

const DeleteAccount: React.FC = () => {
  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const root = document.getElementById("root");
    const previousRootOverflow = root?.style.overflow;

    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    if (root) {
      root.style.overflow = "auto";
    }

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      if (root && previousRootOverflow !== undefined) {
        root.style.overflow = previousRootOverflow;
      }
    };
  }, []);

  return (
    <main className="privacy-page">
      <section className="privacy-shell">
        <header className="privacy-header">
          <p className="privacy-kicker">Veerraaj Foods</p>
          <h1>Delete Account</h1>
          <p className="privacy-updated">Effective date: August 6, 2026</p>
          <p>
            Veerraaj Foods mobile app users can request deletion of their account and associated
            personal app data from inside the app.
          </p>
        </header>

        <div className="privacy-content">
          <section>
            <h2>How to request account deletion</h2>
            <ol>
              <li>Open the Veerraaj Foods mobile app.</li>
              <li>Sign in to your account.</li>
              <li>Open Settings.</li>
              <li>Select Request account deletion.</li>
              <li>Confirm the request.</li>
            </ol>
          </section>

          <section>
            <h2>What data is deleted</h2>
            <p>
              After verification, Veerraaj Foods will delete or anonymize personal account data such
              as name, email address, mobile number, login credentials, and app session information
              where it is no longer required.
            </p>
          </section>

          <section>
            <h2>What may be retained</h2>
            <p>
              Some business records may be retained where required for accounting, tax, audit,
              legal, security, dispute resolution, or operational recordkeeping. This may include
              bills, orders, payments, routes, shops, stock, attendance, or other company records
              connected to completed business activity.
            </p>
          </section>

          <section>
            <h2>Processing time</h2>
            <p>
              Account deletion requests are reviewed by an administrator. Approved requests are
              generally processed within 30 days unless retention is required for legal or business
              recordkeeping reasons.
            </p>
          </section>

          <section>
            <h2>Need help?</h2>
            <p>
              If you cannot access the mobile app, contact your Veerraaj Foods administrator or the
              official business support contact used by your organization and ask for account deletion
              assistance.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
};

export default DeleteAccount;
