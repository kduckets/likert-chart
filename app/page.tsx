import LikertChart from "@/components/likert-chart"
import PivotChart from "@/components/pivot-chart"

export default function Home() {
  return (
    <main className="container mx-auto p-4 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Condition Distribution Chart</h1>
      <LikertChart />
    </main>
  )
}

