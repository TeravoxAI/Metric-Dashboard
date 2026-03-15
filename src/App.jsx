import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Nav } from './components/Nav'
import { OpenRouterSection } from './sections/OpenRouterSection'
import { GenerationSection } from './sections/GenerationSection'
import { ExamGenerationSection } from './sections/ExamGenerationSection'
import { UserSection } from './sections/UserSection'
import { ContentSection } from './sections/ContentSection'
import { Explorer } from './pages/Explorer'
import { Login } from './pages/Login'
import { useAuth } from './hooks/useAuth'

const queryClient = new QueryClient()

function Dashboard() {
  return (
    <main className="mx-auto max-w-6xl space-y-12 px-6 py-8">
      <OpenRouterSection />
      <GenerationSection />
      <ExamGenerationSection />
      <UserSection />
      <ContentSection />
    </main>
  )
}

function AuthGate() {
  const { authed, logout, onLogin } = useAuth()

  if (!authed) return <Login onLogin={onLogin} />

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav onLogout={logout} />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/explorer" element={<Explorer />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
