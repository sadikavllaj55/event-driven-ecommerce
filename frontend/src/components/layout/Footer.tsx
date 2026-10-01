import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export default function Footer() {
  return (
    <footer className="bg-white border-t mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div>
            <h3 className="font-bold text-teal-600 mb-3">Marketplace 🛍️</h3>
            <p className="text-gray-500">
              Buy & sell pre-loved fashion sustainably.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Company</h4>
            <ul className="space-y-2 text-gray-600">
              <li>
                <Link to={ROUTES.about} className="hover:text-teal-600">
                  About
                </Link>
              </li>
              <li>
                <Link to={ROUTES.faq} className="hover:text-teal-600">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Legal</h4>
            <ul className="space-y-2 text-gray-600">
              <li>
                <Link to={ROUTES.terms} className="hover:text-teal-600">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to={ROUTES.privacy} className="hover:text-teal-600">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Shop</h4>
            <ul className="space-y-2 text-gray-600">
              <li>
                <Link to={ROUTES.home} className="hover:text-teal-600">
                  Browse items
                </Link>
              </li>
              <li>
                <Link to={ROUTES.favorites} className="hover:text-teal-600">
                  Favorites
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Marketplace. A full-stack microservices
          demo project.
        </div>
      </div>
    </footer>
  );
}
