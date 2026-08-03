import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { AuthPage } from '@/pages/AuthPage';

const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Library = lazy(() => import('@/pages/Library').then((m) => ({ default: m.Library })));
const AddBook = lazy(() => import('@/pages/AddBook').then((m) => ({ default: m.AddBook })));
const BookDetail = lazy(() => import('@/pages/BookDetail').then((m) => ({ default: m.BookDetail })));
const Wishlist = lazy(() => import('@/pages/Wishlist').then((m) => ({ default: m.Wishlist })));
const Goals = lazy(() => import('@/pages/Goals').then((m) => ({ default: m.Goals })));
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })));
const Admin = lazy(() => import('@/pages/Admin').then((m) => ({ default: m.Admin })));

function Loading() {
  return <div className="flex items-center justify-center h-full"><div className="h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
}

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/auth" replace />;
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;

  return (
    <Routes>
      <Route path="/auth" element={session ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<Protected><Suspense fallback={<Loading />}><Dashboard /></Suspense></Protected>} />
      <Route path="/library" element={<Protected><Suspense fallback={<Loading />}><Library /></Suspense></Protected>} />
      <Route path="/add" element={<Protected><Suspense fallback={<Loading />}><AddBook /></Suspense></Protected>} />
      <Route path="/book/:id" element={<Protected><Suspense fallback={<Loading />}><BookDetail /></Suspense></Protected>} />
      <Route path="/wishlist" element={<Protected><Suspense fallback={<Loading />}><Wishlist /></Suspense></Protected>} />
      <Route path="/goals" element={<Protected><Suspense fallback={<Loading />}><Goals /></Suspense></Protected>} />
      <Route path="/settings" element={<Protected><Suspense fallback={<Loading />}><Settings /></Suspense></Protected>} />
      <Route path="/admin" element={<Protected><Suspense fallback={<Loading />}><Admin /></Suspense></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
