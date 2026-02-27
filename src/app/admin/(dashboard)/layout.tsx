import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyAdminSessionToken } from '@/lib/adminAuth'
import AdminLogoutButton from './AdminLogoutButton'
import Link from 'next/link'

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin-session')?.value

  if (!token || !verifyAdminSessionToken(token)) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-gray-900">anonym.in</span>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              Admin
            </span>
            <Link
              href="/admin"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Übersicht
            </Link>
            <Link
              href="/admin/organizations/new"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Neue Organisation
            </Link>
          </div>
          <AdminLogoutButton />
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  )
}
