import React from "react";
import "./PrivacyPolicy.css";

const PrivacyPolicy: React.FC = () => {
  return (
    <main className="privacy-page">
      <section className="privacy-shell">
        <header className="privacy-header">
          <p className="privacy-kicker">Veerraj Foods</p>
          <h1>Privacy Policy</h1>
          <p className="privacy-updated">Effective date: August 1, 2026</p>
          <p>
            This Privacy Policy explains how Veerraj Foods collects, uses, stores, and protects information
            when users access the Veerraj Foods ERP web application and the Veerraj Foods mobile application.
          </p>
        </header>

        <div className="privacy-content">
          <section>
            <h2>Who this policy applies to</h2>
            <p>
              The ERP and mobile app are business tools used by authorized Veerraj Foods administrators, staff,
              delivery users, and other approved business users. The services help manage products, shops,
              routes, dealers, bills, orders, payments, stock, expenses, and staff attendance.
            </p>
          </section>

          <section>
            <h2>Information we collect</h2>
            <p>Depending on the user role and feature used, we may collect and process the following information:</p>
            <ul>
              <li>Account information such as name, email address, mobile number, role, and login credentials.</li>
              <li>Business records such as customer, dealer, retailer, shop, product, order, bill, stock, payment, and expense details.</li>
              <li>Shop details such as shop name, address, route, mobile number, photo, and map coordinates when saved by an authorized user.</li>
              <li>Attendance information such as punch in, punch out, break timing, status, date, time, and location verification details.</li>
              <li>Device and app information needed for authentication, security, troubleshooting, and service reliability.</li>
            </ul>
          </section>

          <section>
            <h2>Mobile app permissions</h2>
            <p>The Veerraj Foods mobile app requests only the permissions needed for business functions:</p>
            <ul>
              <li>
                <strong>Location:</strong> used while the app is in use to save shop coordinates, support map
                navigation, and verify staff attendance near an approved work location. The app does not request
                background location access.
              </li>
              <li>
                <strong>Camera:</strong> used when an authorized user chooses to capture a shop photo for shop
                records. Camera access is not used for recording audio.
              </li>
              <li>
                <strong>Local storage:</strong> used to keep authentication/session details on the device so the
                user can remain signed in securely.
              </li>
            </ul>
          </section>

          <section>
            <h2>How we use information</h2>
            <ul>
              <li>To authenticate users and control access based on assigned roles.</li>
              <li>To operate ERP and mobile app features requested by authorized users.</li>
              <li>To maintain accurate business records for orders, billing, delivery, stock, routes, shops, and attendance.</li>
              <li>To improve reliability, prevent misuse, investigate errors, and protect the security of the services.</li>
              <li>To communicate with users about account, operational, or support matters.</li>
            </ul>
          </section>

          <section>
            <h2>Data sharing</h2>
            <p>
              We do not sell personal information. We share information only when needed to operate the services,
              comply with legal requirements, protect our rights, or work with trusted service providers such as
              hosting, database, storage, analytics, or support providers. These providers are allowed to use data
              only for the services they provide to Veerraj Foods.
            </p>
          </section>

          <section>
            <h2>Data security</h2>
            <p>
              We use reasonable administrative, technical, and organizational measures to protect information from
              unauthorized access, loss, misuse, alteration, or disclosure. Access to ERP and mobile app data is
              restricted to authorized users based on their business role.
            </p>
          </section>

          <section>
            <h2>Data retention</h2>
            <p>
              We keep business and account information for as long as needed to provide the services, maintain
              company records, meet legal or tax obligations, resolve disputes, and enforce agreements. When data is
              no longer required, we delete it or de-identify it where reasonably possible.
            </p>
          </section>

          <section>
            <h2>User choices and deletion requests</h2>
            <p>
              Authorized users may contact Veerraj Foods to request access, correction, or deletion of their
              personal information, subject to business recordkeeping, legal, and security requirements. If a user
              no longer needs access, the company may deactivate or remove the account.
            </p>
          </section>

          <section>
            <h2>Children's privacy</h2>
            <p>
              The ERP and mobile app are intended for business use and are not directed to children. We do not
              knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2>Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Updates will be posted on this page with a new
              effective date. Continued use of the ERP or mobile app after an update means the user accepts the
              updated policy.
            </p>
          </section>

          <section>
            <h2>Contact us</h2>
            <p>
              For privacy questions, account requests, or data deletion requests, please contact Veerraj Foods
              through the official business support channel provided to your organization or administrator.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
};

export default PrivacyPolicy;
