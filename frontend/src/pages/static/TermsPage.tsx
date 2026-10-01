import StaticPage from './StaticPage';

export default function TermsPage() {
  return (
    <StaticPage title="Terms & Conditions">
      <p>
        <strong>1. Acceptance of Terms.</strong> By using Marketplace, you agree
        to these terms. If you do not agree, please do not use the platform.
      </p>
      <p>
        <strong>2. Accounts.</strong> You must provide accurate information and
        keep your credentials secure. You are responsible for all activity under
        your account.
      </p>
      <p>
        <strong>3. Listings.</strong> Sellers are responsible for the accuracy
        of their listings. Prohibited, counterfeit, or illegal items are not
        allowed.
      </p>
      <p>
        <strong>4. Purchases.</strong> Buyers agree to pay the listed price.
        Prices are set by the platform based on seller listings and cannot be
        altered by buyers.
      </p>
      <p>
        <strong>5. Conduct.</strong> Users must not abuse, defraud, or harass
        others. Accounts violating these terms may be suspended or banned.
      </p>
      <p>
        <strong>6. Liability.</strong> The platform is provided "as is" without
        warranties. We are not liable for disputes between buyers and sellers.
      </p>
      <p className="text-gray-400 text-xs">
        Last updated: this is a demo document.
      </p>
    </StaticPage>
  );
}
