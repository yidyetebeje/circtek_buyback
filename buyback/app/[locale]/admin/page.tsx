import { AdminHeader } from '@/components/admin/AdminHeader';

export default function AdminRootPage() {
  // This page should ideally be redirected by the middleware
  // to /admin/dashboards if authenticated, or /admin/login if not.
  // If the middleware is correctly configured, this content might not be seen often.
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Admin"
        breadcrumbs={[
          { label: 'Admin', isCurrentPage: true }
        ]}
      />
      <div className="flex items-center justify-center py-8">
        <p>Loading dashboard...</p>
      </div>
    </div>
  );
}
