"use client"

import { useState, useEffect } from "react"
import { Bar, BarChart, Cell, Pie, PieChart } from "recharts"

import { ChartContainer, ChartTooltip } from "@/components/ui/chart"

interface DataItem {
  Condition: string
  Age: string
  Sex: string
  "Reason not diagnosed": string
}

const parseCSV = (csv: string): DataItem[] => {
  const lines = csv.split("\n")
  const headers = lines[0].split(",")
  return lines
    .slice(1)
    .map((line) => {
      const values = line.split(",")
      return headers.reduce((obj, header, index) => {
        obj[header.trim()] = values[index]?.trim() || ""
        return obj
      }, {} as any) as DataItem
    })
    .filter((item) => item.Condition) // Filter out empty rows
}

const countConditions = (data: DataItem[]) => {
  const counts: { [key: string]: number } = {}
  data.forEach((item) => {
    if (item.Condition) {
      const conditions = item.Condition.split(", ")
      conditions.forEach((condition) => {
        counts[condition] = (counts[condition] || 0) + 1
      })
    }
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }))
}

const countSex = (data: DataItem[]) => {
  const counts: { [key: string]: number } = { Male: 0, Female: 0, Unknown: 0 }
  data.forEach((item) => {
    if (item.Sex === "M" || item.Sex === "Male") counts.Male++
    else if (item.Sex === "F" || item.Sex === "Female") counts.Female++
    else counts.Unknown++
  })
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#8DD1E1",
  "#A4DE6C",
  "#D0ED57",
]

export default function MedicalDataChart() {
  const [data, setData] = useState<DataItem[]>([])
  const [topConditions, setTopConditions] = useState<{ name: string; value: number }[]>([])
  const [sexDistribution, setSexDistribution] = useState<{ name: string; value: number }[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const csvData = `Condition,Age,Sex,Reason not diagnosed
Syndromic intellectual disability,11,M,
Inborn errors of immunity,12,M,
"Infantile epilepsy syndrome, Syndromic intellectual disability",2,M,
Syndromic intellectual disability,3,F,
Syndromic intellectual disability,23,F,
Syndromic intellectual disability,5,M,
Syndromic intellectual disability,15,F,
Syndromic intellectual disability,18,M,
infertility disorder,34,F,
Syndromic intellectual disability,12,F,
"Syndromic intellectual disability, Childhood-onset epilepsy syndrome",14,M,
Congenital/juvenile neuromuscular disease,2,M,
Neurodegenerative disease- pediatric,13,F,
Syndromic intellectual disability,4,M,
"Syndromic intellectual disability, Childhood-onset epilepsy syndrome",3,M,
Syndromic intellectual disability,2,F,
Infantile epilepsy syndrome,6,M,
"Syndromic intellectual disability, Childhood-onset epilepsy syndrome",17,F,
Syndromic intellectual disability,5,F,
"Syndromic intellectual disability, Childhood-onset epilepsy syndrome",14,M,
Syndromic intellectual disability,3,M,
Infantile epilepsy syndrome,0,M,
Syndromic intellectual disability,2,M,
Syndromic intellectual disability,2,M,
Nephrotic syndrome,7,F,
Multiple congenital anomalies/dysmorphic syndrome without intellectual disability,1,M,
Syndromic intellectual disability,15,F,
Syndromic intellectual disability,3,F,
Syndromic intellectual disability,13,M,
Suspicion of inborn mitochondrial metabolism disorder,8,M,
Leukodystrophy,4,F,
Neurodegenerative disease- pediatric,14,F,
"Syndromic intellectual disability, Hearing loss",40,M,
neutropenia,1,F,
Syndromic intellectual disability,7,M,
Suspicion of inborn errors of metabolism,7,F,
"Limb girdle muscular dystrophy (LGMD), Neuromuscular disease-late onset",50,M,
"Limb girdle muscular dystrophy (LGMD), Neuromuscular disease-late onset",66,F,
"Limb girdle muscular dystrophy (LGMD), Neuromuscular disease-late onset",65,F,
"Limb girdle muscular dystrophy (LGMD), Neuromuscular disease-late onset",,,
Infantile epilepsy syndrome,,,
Non-syndromic intellectual disability,,,
Syndromic intellectual disability,,,
"Syndromic intellectual disability, Congenital/juvenile neuromuscular disease",,,
Infantile epilepsy syndrome,,,
Suspicion of inborn mitochondrial metabolism disorder,,,
Non-syndromic intellectual disability,,,
Infantile epilepsy syndrome,,,
Syndromic intellectual disability,9,M,
neutropenia,,F,
Congenital/juvenile neuromuscular disease,,,
diabetes mellitus,,,
Syndromic intellectual disability,,,
"Non-syndromic intellectual disability, Atactic disorder (ataxia)",35,Male,
craniofacial malformations,,,
Syndromic intellectual disability,,,
Non-syndromic intellectual disability,,,
Congenital/juvenile neuromuscular disease,,,
Neuromuscular disease-late onset,,,
"Limb girdle muscular dystrophy (LGMD), Neuromuscular disease-late onset",,,
"Syndromic intellectual disability, Childhood-onset epilepsy syndrome",,,
Congenital/juvenile neuromuscular disease,,,
Retinal disorder,,,
Neuromuscular disease-late onset,46,F,
"Atactic disorder (ataxia), Neuromuscular disease-late onset",,,
"Multiple congenital anomalies/dysmorphic syndrome without intellectual disability, Craniofacial malformations",5,F,
"Limb girdle muscular dystrophy (LGMD), Neuromuscular disease-late onset",,,
Neuromuscular disease-late onset,,,
Congenital/juvenile neuromuscular disease,,,
Syndromic intellectual disability,11,F,
"Limb girdle muscular dystrophy (LGMD), Neuromuscular disease-late onset",,,
Atactic disorder (ataxia),,,
"Limb girdle muscular dystrophy (LGMD), Neuromuscular disease-late onset",,,
Syndromic intellectual disability,,,
"Cerebral malformation, Infantile epilepsy syndrome",,,
Neuroendocrine disorder,,,
"Limb girdle muscular dystrophy (LGMD), Neuromuscular disease-late onset",,,
Congenital/juvenile neuromuscular disease,,,
Suspicion of inborn errors of metabolism,,,
Non-syndromic intellectual disability,,,
Syndromic intellectual disability,,,
"Limb girdle muscular dystrophy (LGMD), Congenital/juvenile neuromuscular disease",,,
Neuromuscular disease-late onset,,,
Infantile epilepsy syndrome,,,
Neuromuscular disease-late onset,,,
Neuromuscular disease-late onset,72,M,
Neuromuscular disease-late onset,,,
Infantile epilepsy syndrome,,,
Neuromuscular disease-late onset,,,
Syndromic intellectual disability,10,F,
Congenital/juvenile neuromuscular disease,,,
Congenital/juvenile neuromuscular disease,,,
Neuromuscular disease-late onset,,,
kidney disorder,,,
"Overgrowth syndrome, Syndromic intellectual disability",5,M,
"Syndromic intellectual disability, Childhood-onset epilepsy syndrome",,,
HHT,,,
Neuromuscular disease-late onset,,,
Multiple congenital anomalies/dysmorphic syndrome without intellectual disability,,,
Neurodegenerative disease- pediatric,,,
HHT,,,
Multiple congenital anomalies/dysmorphic syndrome without intellectual disability,,,
Hermansky-Pudlack syndrome (HPS),,,
Non-syndromic intellectual disability,,,
Nephrotic syndrome,,,
"Limb girdle muscular dystrophy (LGMD), Neuromuscular disease-late onset",,,
Dystonic disorder,,,
Neuromuscular disease-late onset,,,
"Syndromic intellectual disability, atactic disorder",,,
"Lennox-Gastaut syndrome (LGS), Childhood-onset epilepsy syndrome",,,
Nephrotic syndrome,,,
#N/A,,,
#N/A,,,
Syndromic intellectual disability,,,
Non-syndromic intellectual disability,,,
HHT,,,
Neuromuscular disease-late onset,,,
Neuromuscular disease-late onset,,,
Neuromuscular disease-late onset,,,
"Infantile epilepsy syndrome, Syndromic intellectual disability",4,F,
infertility disorder,,,
HHT,,,
"Lennox-Gastaut syndrome (LGS), Childhood-onset epilepsy syndrome",,,
Syndromic intellectual disability,,,
Syndromic intellectual disability,4,M,
"Syndromic intellectual disability, Leukodystrophy",,,
Syndromic intellectual disability,,,
Congenital/juvenile neuromuscular disease,,,
Syndromic intellectual disability,,,
HHT,,,
Neuromuscular disease-late onset,,,
Syndromic intellectual disability,,,
Syndromic intellectual disability,,,
HHT,,,
"Limb girdle muscular dystrophy (LGMD), Neuromuscular disease-late onset",,,
Neuromuscular disease-late onset,,,
HHT,,,
Neuromuscular disease-late onset,,,
Syndromic intellectual disability,,,
Neuromuscular disease-late onset,,,
Infantile epilepsy syndrome,,,
HHT,,,
Non-syndromic intellectual disability,,,
HHT,,,
Syndromic intellectual disability,,,
Difference of sexual differentiation (DSD),,,
"Lennox-Gastaut syndrome (LGS), Infantile epilepsy syndrome",,,
#N/A,,,
"Limb girdle muscular dystrophy (LGMD), Neuromuscular disease-late onset",,,
Syndromic intellectual disability,,,
Infantile epilepsy syndrome,,,
"Limb girdle muscular dystrophy (LGMD), Congenital/juvenile neuromuscular disease",,,
Syndromic intellectual disability,,,
eye disorder,,,
"Non-syndromic intellectual disability, Childhood-onset epilepsy syndrome",,,
Syndromic intellectual disability,,,
Genetic skin disease,,,
Syndromic intellectual disability,,,
Syndromic intellectual disability,,,
Syndromic intellectual disability,,,
Hermansky-Pudlack syndrome (HPS),,,
Neurodegenerative disease- adult,,,
Syndromic intellectual disability,,,
neutropenia,,,`

      const parsedData = parseCSV(csvData)
      setData(parsedData)
      setTopConditions(countConditions(parsedData))
      setSexDistribution(countSex(parsedData))
      setError(null)
    } catch (err) {
      console.error("Error processing data:", err)
      setError("An error occurred while processing the data. Please check the console for more details.")
    }
  }, [])

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Top 10 Conditions</h2>
        <ChartContainer className="h-[400px]">
          <BarChart data={topConditions} layout="vertical" margin={{ left: 200 }}>
            <ChartTooltip />
            <Bar dataKey="value">
              {topConditions.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Sex Distribution</h2>
        <ChartContainer className="h-[400px]">
          <PieChart>
            <ChartTooltip />
            <Pie data={sexDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={150} label>
              {sexDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  )
}

