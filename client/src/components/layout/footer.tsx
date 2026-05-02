import { Link, useLocation } from 'wouter';

export default function Footer() {
  const [location] = useLocation();
  const isGh = location.startsWith('/gh');
  const basePrefix = isGh ? '/gh' : '';

  return (
    <footer className="bg-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">The University Hub</h3>
            <p className="text-gray-300 mb-4">
              the student market place - connecting students across campuses.
            </p>
            <div className="flex space-x-4">
              <a href="https://facebook.com/universityhub" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="https://twitter.com/universityhub" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="https://instagram.com/universityhub" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="https://tiktok.com/@universityhub" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
                <i className="fab fa-tiktok"></i>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">For Buyers</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href={`${basePrefix}/browse`} className="hover:text-white transition-colors">
                  Browse Products
                </Link>
              </li>
              <li>
                <Link href={`${basePrefix}/browse?view=stores`} className="hover:text-white transition-colors">
                  Find Stores
                </Link>
              </li>
              <li>
                <Link href={`${basePrefix}/`} className="hover:text-white transition-colors">
                  Daily Deals
                </Link>
              </li>
              <li>
                <Link href={`${basePrefix}/browse`} className="hover:text-white transition-colors">
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">For Sellers</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href={`${basePrefix}/seller-auth`} className="hover:text-white transition-colors">
                  Start Selling
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Seller Guide
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Pricing & Fees
                </Link>
              </li>
              <li>
                <Link href={`${basePrefix}/dashboard`} className="hover:text-white transition-colors">
                  Store Analytics
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Safety Tips
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Community Guidelines
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-300 text-sm">© 2024 The University Hub. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/about" className="text-gray-300 hover:text-white text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white text-sm transition-colors">
              Terms of Service
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white text-sm transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
