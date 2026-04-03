import Navbar from './Navbar'
import Sidebar from './Sidebar'
import type { NavItem } from './Sidebar'

/**
 * Standard internal page layout:
 * - Navbar (bg-[#1e3a5f])
 * - Sidebar (220px right) + Content area (bg-[#f8f9fa])
 */
export default function PageLayout({
  children,
  sidebarItems,
}: {
  children: React.ReactNode
  sidebarItems?: NavItem[]
}) {
  return (
    <div className="min-h-screen bg-[#f8f9fa]" dir="rtl">
      <Sidebar overrideItems={sidebarItems} />
      <div className="page-content">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-[22px] font-extrabold text-[#212121] mb-5">{children}</h1>
}
