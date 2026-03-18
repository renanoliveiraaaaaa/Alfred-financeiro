import Topbar from '@/components/Topbar'
import Sidebar from '@/components/Sidebar'
import AnimatedPage from '@/components/AnimatedPage'
import CommandPalette from '@/components/CommandPalette'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-manor-950 flex transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 overflow-auto">
          <AnimatedPage>{children}</AnimatedPage>
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
