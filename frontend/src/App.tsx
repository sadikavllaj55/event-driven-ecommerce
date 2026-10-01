import { Routes, Route, Link } from 'react-router-dom';
import ProductsPage from './pages/ProductsPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-teal-600">
            Marketplace 🛍️
          </Link>
        </div>
      </header>

      {/* Pages */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<ProductsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
