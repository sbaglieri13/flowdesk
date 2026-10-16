import { lazy, Suspense, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import type { View } from './components/layout/NavBar'
import { BoardPage } from './pages/BoardPage'
import { BoardProvider } from './state/BoardContext'
import { useBoardData } from './state/useBoardData'
import { ThemeProvider } from './state/ThemeContext'

const StatsPage = lazy(() => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function LoadingScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="brand-gradient h-10 w-10 animate-[spin_1.4s_linear_infinite] rounded-xl shadow-glow" />
      <span className="text-sm font-medium text-slate-400 dark:text-slate-500">Loading Flowdesk...</span>
    </div>
  )
}

function AppContent() {
  const [view, setView] = useState<View>('board')
  const { loading } = useBoardData()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <AppShell view={view} onViewChange={setView}>
      {view === 'board' && <BoardPage />}
      <Suspense fallback={null}>
        {view === 'stats' && <StatsPage onBack={() => setView('board')} />}
        {view === 'settings' && <SettingsPage onBack={() => setView('board')} />}
      </Suspense>
    </AppShell>
  )
}

function App() {
  return (
    <ThemeProvider>
      <BoardProvider>
        <AppContent />
      </BoardProvider>
    </ThemeProvider>
  )
}

export default App
