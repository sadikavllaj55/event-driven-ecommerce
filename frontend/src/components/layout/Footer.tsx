import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-[var(--market-ink)] bg-[var(--market-ink)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 text-sm sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
          <div>
            <h3 className="mb-3 font-bold text-white">Marketplace</h3>
            <p className="max-w-xs text-emerald-100/75">
              Buy & sell pre-loved fashion sustainably.
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-white">Company</h4>
            <ul className="space-y-2.5 text-emerald-100/75">
              <li>
                <Link
                  to={ROUTES.about}
                  className="transition-colors hover:text-white"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.faq}
                  className="transition-colors hover:text-white"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-white">Legal</h4>
            <ul className="space-y-2.5 text-emerald-100/75">
              <li>
                <Link
                  to={ROUTES.terms}
                  className="transition-colors hover:text-white"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.privacy}
                  className="transition-colors hover:text-white"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-white">Shop</h4>
            <ul className="space-y-2.5 text-emerald-100/75">
              <li>
                <Link
                  to={ROUTES.home}
                  className="transition-colors hover:text-white"
                >
                  Browse items
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.favorites}
                  className="transition-colors hover:text-white"
                >
                  Favorites
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/15 pt-5 text-xs text-emerald-100/60 sm:flex sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Marketplace</span>
          <span className="mt-2 block sm:mt-0">
            A full-stack marketplace demo
          </span>
        </div>
      </div>
    </footer>
  );
}
