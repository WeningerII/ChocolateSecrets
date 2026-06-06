import { useState, useEffect, Suspense } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Package, BookOpen, ClipboardList, LayoutDashboard, ShoppingCart, Building2, Globe, MapPin, History, BarChart3, LogIn, LogOut, User, Menu, X as CloseIcon, Settings, BookMarked, Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { auth, signInWithGoogle, logOut } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { useUserRole } from '../hooks/useUserRole';
import { useAlerts } from '../hooks/useAlerts';
import AlertsBell from './AlertsBell';
import PageSpinner from './PageSpinner';

export default function Layout() {
  const location = useLocation();
  const { t, i18n } = useTranslation(['nav', 'common', 'auth']);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { role } = useUserRole();
  const isAdmin = role === 'admin';
  const { alerts } = useAlerts();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { path: '/', label: t('nav:dashboard'), icon: LayoutDashboard },
    { path: '/ingredients', label: t('nav:ingredients'), icon: Package },
    { path: '/suppliers', label: t('nav:suppliers'), icon: Building2 },
    { path: '/purchase-orders', label: t('nav:purchaseOrders'), icon: ShoppingCart },
    { path: '/inventory', label: t('nav:inventory'), icon: MapPin },
    { path: '/transactions', label: t('nav:transactions'), icon: History },
    { path: '/recipes', label: t('nav:recipes'), icon: BookOpen },
    { path: '/prep-list', label: t('nav:prepList'), icon: ClipboardList },
    { path: '/shopping-list', label: t('nav:shoppingList'), icon: ShoppingCart },
    { path: '/reports', label: t('nav:reports'), icon: BarChart3 },
    { path: '/expenses', label: t('nav:expenses'), icon: Receipt },
  ];

  const adminNavItems = [
    { path: '/admin/restaurant', label: t('nav:restaurantSettings'), icon: Settings },
  ];

  const SidebarContent = ({ showAlerts = false }: { showAlerts?: boolean }) => (
    <>
      <div className="p-6 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-stone-800">
          {t('common:app.title.chocolate')}<br />
          <span className="text-amber-700">{t('common:app.title.secrets')}</span>
        </h1>
        {showAlerts && user && <AlertsBell alerts={alerts} align="left" />}
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                isActive 
                  ? 'bg-amber-50 text-amber-900 font-medium' 
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-amber-700' : 'text-stone-400'}`} />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 mx-4 border-t border-stone-200" />
            <div className="px-4 pb-1 text-[10px] uppercase tracking-wider text-stone-500 font-medium">{t('nav:admin')}</div>

            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                    isActive 
                      ? 'bg-amber-50 text-amber-900 font-medium' 
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-amber-700' : 'text-stone-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-stone-200 space-y-4">
        <div className="px-3">
          {authLoading ? (
            <div className="h-10 bg-stone-100 animate-pulse rounded-xl" />
          ) : user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-stone-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{user.displayName || user.email}</p>
                  <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={logOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('auth:logout')}
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              {t('auth:login')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 px-3">
          <Globe className="w-4 h-4 text-stone-400" />
          <select 
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="bg-transparent text-sm font-medium text-stone-600 focus:outline-none cursor-pointer w-full"
          >
            <option value="en">{t('common:language.english')}</option>
            <option value="es">{t('common:language.spanish')}</option>
            <option value="ko">{t('common:language.korean')}</option>
          </select>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-stone-50 text-stone-900 font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-stone-200 flex-col shrink-0">
        <SidebarContent showAlerts />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-stone-200 px-4 flex items-center justify-between z-40">
        <h1 className="text-lg font-bold tracking-tight text-stone-800">
          {t('common:app.title.chocolate')} <span className="text-amber-700">{t('common:app.title.secrets')}</span>
        </h1>
        <div className="flex items-center gap-1">
          {user && <AlertsBell alerts={alerts} align="right" />}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-50 flex flex-col shadow-2xl"
            >
              <div className="absolute top-4 right-4">
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-600"
                >
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="p-4 sm:p-8 max-w-6xl mx-auto">
          {authLoading ? (
            <div className="flex h-[300px] items-center justify-center">
              <div className="w-8 h-8 border-4 border-amber-700 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : user ? (
            <Suspense fallback={<PageSpinner />}>
              <Outlet />
            </Suspense>
          ) : (
            <div className="flex flex-col h-[400px] items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                <LogIn className="w-8 h-8 text-amber-700" />
              </div>
              <h2 className="text-2xl font-bold text-stone-800 tracking-tight mb-2">
                {t('auth:loginRequired', 'Authentication Required')}
              </h2>
              <p className="text-stone-500 max-w-md mb-8">
                {t('auth:pleaseLogin', 'Please log in using the button in the sidebar to access your workspace.')}
              </p>
              <button
                onClick={signInWithGoogle}
                className="lg:hidden flex items-center justify-center gap-2 px-6 py-3 bg-amber-700 hover:bg-amber-800 text-white text-base font-medium rounded-xl transition-colors shadow-sm"
              >
                <LogIn className="w-5 h-5" />
                {t('auth:login')}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

