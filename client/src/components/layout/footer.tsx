import { Link, useLocation } from 'wouter';

export default function Footer() {
  const [location] = useLocation();
  const isGh = location.startsWith('/gh');
  const basePrefix = isGh ? '/gh' : '';

  return (
    <footer className="bg-white border-t border-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-xl font-black italic tracking-tighter mb-2 uppercase">The Hub.</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed text-center md:text-left max-w-[200px]">
              The innovative marketplace built for the student community in Ghana.
            </p>
          </div>

          <div className="flex gap-8">
            <div className="flex flex-col items-center md:items-start gap-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">Explore</h4>
              <div className="flex gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <Link href="/browse" className="hover:text-primary transition-colors">Market</Link>
                <Link href="/seller-auth" className="hover:text-primary transition-colors">Sell</Link>
                <Link href="/about" className="hover:text-primary transition-colors">About</Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
             <div className="flex space-x-4 mb-1">
                <a href="#" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-black hover:text-white transition-all"><i className="fab fa-facebook-f text-xs"></i></a>
                <a href="#" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-black hover:text-white transition-all"><i className="fab fa-instagram text-xs"></i></a>
                <a href="#" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-black hover:text-white transition-all"><i className="fab fa-tiktok text-xs"></i></a>
             </div>
             <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.2em]">© 2026 Powered by Kaydem Ghana</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
