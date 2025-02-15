import { ThemeProvider } from "@/components/theme-provider"
import DataDashboard from "@/components/data-dashboard"

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <main className="container mx-auto p-4 min-h-screen">
        <h1 className="text-2xl font-bold mb-6">Steph's Data Analysis Dashboard</h1>
        <DataDashboard />
      </main>
    </ThemeProvider>
  )
}

