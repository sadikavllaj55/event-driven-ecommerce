import StaticPage from './StaticPage';

const faqs = [
  {
    q: 'How do I buy an item?',
    a: 'Browse or search, open a listing, add it to your cart, and check out. Your order is processed securely.',
  },
  {
    q: 'How do I sell?',
    a: 'Register as a seller, create a listing with photos and details, and manage it from your dashboard.',
  },
  {
    q: 'Is my payment secure?',
    a: 'Yes — all purchases are processed server-side and protected. Prices cannot be tampered with.',
  },
  {
    q: 'What is 2FA?',
    a: 'Two-factor authentication adds an extra layer of security using a code from your authenticator app.',
  },
  {
    q: 'Can I favorite items?',
    a: 'Yes — tap the heart on any item to save it to your wishlist.',
  },
];

export default function FaqPage() {
  return (
    <StaticPage title="Frequently Asked Questions">
      {faqs.map((f) => (
        <div key={f.q}>
          <p className="font-semibold text-gray-900">{f.q}</p>
          <p>{f.a}</p>
        </div>
      ))}
    </StaticPage>
  );
}
