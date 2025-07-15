import { Link } from 'wouter';

export default function Footer() {
  return (
    <footer className="bg-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">StudentMarket</h3>
            <p className="text-gray-300 mb-4">
              The trusted marketplace connecting students across campuses.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <i className="fab fa-tiktok"></i>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">For Buyers</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href="/browse" className="hover:text-white transition-colors">
                  Browse Products
                </Link>
              </li>
              <li>
                <Link href="/browse" className="hover:text-white transition-colors">
                  Find Stores
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Daily Deals
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Wishlist
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">For Sellers</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Start Selling
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Seller Guide
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Pricing & Fees
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Store Analytics
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Safety Tips
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Community Guidelines
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-300 text-sm">© 2024 StudentMarket. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-300 hover:text-white text-sm transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-300 hover:text-white text-sm transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-gray-300 hover:text-white text-sm transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
