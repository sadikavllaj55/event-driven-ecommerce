import StaticPage from './StaticPage';

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy Policy">
      <p>
        <strong>Data we collect.</strong> Account details (email, name),
        listings, orders, and favorites needed to operate the marketplace.
      </p>
      <p>
        <strong>How we use it.</strong> To provide the service — authentication,
        order processing, search, and notifications.
      </p>
      <p>
        <strong>Security.</strong> Passwords are hashed (bcrypt), authentication
        uses JWTs, and optional two-factor authentication (2FA) is available.
      </p>
      <p>
        <strong>Your rights.</strong> You can access or delete your data by
        contacting support.
      </p>
      <p>
        <strong>Sharing.</strong> We do not sell your personal data to third
        parties.
      </p>
      <p className="text-gray-400 text-xs">
        Last updated: this is a demo document.
      </p>
    </StaticPage>
  );
}
