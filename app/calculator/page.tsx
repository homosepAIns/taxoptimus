import TopAppBar from '@/components/TopAppBar'
import BottomNavBar from '@/components/BottomNavBar'
import LandingChat from '@/components/LandingChat'

export default function CalculatorPage() {
  return (
    <div className="bg-surface text-on-surface pb-32">
      <TopAppBar />
      <main className="mt-20 pt-4">
        <LandingChat />
      </main>
      <BottomNavBar />
    </div>
  )
}
