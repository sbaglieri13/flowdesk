import { motion } from 'framer-motion'
import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import type { View } from './components/layout/NavBar'
import { BoardPage } from './pages/BoardPage'
import { SettingsPage } from './pages/SettingsPage'
import { BoardProvider, useBoardData } from './state/BoardContext'
import { ThemeProvider } from './state/ThemeContext'

function LoadingScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <motion.div
        className="brand-gradient h-10 w-10 rounded-xl shadow-glow"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
      />
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
      {view === 'settings' && <SettingsPage onBack={() => setView('board')} />}
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
