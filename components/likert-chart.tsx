"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Bar, BarChart, XAxis, YAxis, Tooltip, type TooltipProps, ResponsiveContainer } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import * as XLSX from "xlsx"

interface DataItem {
  [key: string]: string // Dynamic columns
}

interface ProcessedDataItem {
  condition: string
  [key: string]: string | number
}

const parseCSV = (csv: string): { headers: string[]; data: DataItem[] } => {
  const lines = csv.split("\n")
  const headers = lines[0].split(",").map((h) => h.trim())
  const data = lines
    .slice(1)
    .map((line) => {
      const values = line.split(",")
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index]?.trim() || ""
        return obj
      }, {} as DataItem)
    })
    .filter((item) => Object.values(item).some((v) => v))
  return { headers, data }
}

const processData = (data: DataItem[], conditionColumn: string, selectedColumns: string[]): ProcessedDataItem[] => {
  if (!data || data.length === 0) return []

  const conditionCounts: { [key: string]: { total: number; counts: { [key: string]: number } } } = {}

  data.forEach((item) => {
    if (!item[conditionColumn]) return

    const conditions = item[conditionColumn].split(", ")
    conditions.forEach((condition) => {
      if (!conditionCounts[condition]) {
        conditionCounts[condition] = { total: 0, counts: {} }
        selectedColumns.forEach((col) => (conditionCounts[condition].counts[col] = 0))
      }
      conditionCounts[condition].total++

      selectedColumns.forEach((col) => {
        const value = item[col]
        if (value) {
          const numValue = Number.parseFloat(value)
          if (!isNaN(numValue)) {
            conditionCounts[condition].counts[col] += numValue
          } else {
            conditionCounts[condition].counts[col]++
          }
        }
      })
    })
  })

  return Object.entries(conditionCounts)
    .map(([condition, { total, counts }]) => ({
      condition,
      ...Object.fromEntries(
        selectedColumns.map((col) => {
          const isNumeric = !isNaN(Number.parseFloat(data[0]?.[col] || ""))
          if (isNumeric) {
            return [col, counts[col] / total || 0]
          } else {
            return [col, (counts[col] / total) * 100 || 0]
          }
        }),
      ),
    }))
    .sort((a, b) => {
      const aValue = a[selectedColumns[0]] as number
      const bValue = b[selectedColumns[0]] as number
      return (bValue || 0) - (aValue || 0)
    })
    .slice(0, 20)
}

export default function LikertChart() {
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [conditionColumn, setConditionColumn] = useState<string>("")
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [rawData, setRawData] = useState<DataItem[]>([])
  const [data, setData] = useState<ProcessedDataItem[]>([])
  const [filter, setFilter] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (conditionColumn && selectedColumns.length > 0) {
      const timer = setTimeout(() => {
        updateChartData()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [selectedColumns, conditionColumn]) // Removed unnecessary dependencies: rawData, filter

  const updateChartData = () => {
    try {
      const filteredData = rawData.filter(
        (item) => item[conditionColumn] && item[conditionColumn].toLowerCase().includes(filter.toLowerCase()),
      )
      const processedData = processData(filteredData, conditionColumn, selectedColumns)
      setData(processedData)
    } catch (err) {
      console.error("Error updating chart data:", err)
      setError("An error occurred while updating the chart. Please check the console for more details.")
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)

    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let headers: string[]
        let parsedData: DataItem[]

        if (file.name.endsWith(".csv")) {
          const result = parseCSV(e.target?.result as string)
          headers = result.headers
          parsedData = result.data
        } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          const workbook = XLSX.read(e.target?.result, { type: "binary" })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const rawJsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 })

          headers = (rawJsonData[0] as string[]).map((h) => h.trim())
          parsedData = (rawJsonData.slice(1) as any[])
            .map((row) => {
              const item: DataItem = {}
              headers.forEach((header, index) => {
                item[header] = row[index]?.toString() || ""
              })
              return item
            })
            .filter((item) => Object.values(item).some((v) => v))
        } else {
          throw new Error("Unsupported file type")
        }

        setAvailableColumns(headers)
        setConditionColumn(headers[0])
        setSelectedColumns(headers.slice(1, 4)) // Default to first three columns after condition
        setRawData(parsedData)
      } catch (err) {
        console.error("Error parsing file:", err)
        setError("Error parsing file. Please check the format and try again.")
      }
    }

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file)
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      reader.readAsBinaryString(file)
    } else {
      setError("Unsupported file type. Please upload a CSV or Excel file.")
    }
  }

  const generateColors = (count: number) => {
    const baseHues = [215, 338, 150, 45, 280]
    return Array.from({ length: count }, (_, i) => {
      const hue = baseHues[i % baseHues.length]
      const saturation = 70 + (i % 2) * 10
      const lightness = 65 + (i % 3) * 5
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`
    })
  }

  const colors = Object.fromEntries(selectedColumns.map((col, i) => [col, generateColors(selectedColumns.length)[i]]))

  const chartConfig = Object.fromEntries(Object.entries(colors).map(([key, color]) => [key, { color }]))

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="max-w-sm" />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {availableColumns.length > 0 && (
        <>
          <div className="space-y-4">
            <div>
              <Label htmlFor="condition-column">Condition Column</Label>
              <Select value={conditionColumn} onValueChange={setConditionColumn}>
                <SelectTrigger id="condition-column">
                  <SelectValue>{conditionColumn}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-4">
              {[0, 1, 2].map((index) => (
                <div key={index} className="flex-1">
                  <Label htmlFor={`column-${index}`}>Column {index + 1}</Label>
                  <Select
                    value={selectedColumns[index] || ""}
                    onValueChange={(value) => {
                      const newColumns = [...selectedColumns]
                      newColumns[index] = value
                      setSelectedColumns(newColumns)
                    }}
                  >
                    <SelectTrigger id={`column-${index}`}>
                      <SelectValue>{selectedColumns[index] || "Select column"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns
                        .filter((col) => col !== conditionColumn)
                        .map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="filter">Filter Conditions</Label>
              <Input
                id="filter"
                placeholder="Enter condition to filter..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>

          {data.length > 0 ? (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <ChartContainer className="h-[800px] p-4" config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
                    layout="vertical"
                    stackOffset="expand"
                    barGap={0}
                    barCategoryGap={8}
                    margin={{
                      top: 20,
                      right: 40,
                      bottom: 20,
                      left: 200,
                    }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={(value) => {
                        const firstCol = selectedColumns[0]
                        const isNumeric = !isNaN(Number.parseFloat(rawData[0]?.[firstCol] || ""))
                        return isNumeric ? value.toFixed(1) : `${(value * 100).toFixed(1)}%`
                      }}
                    />
                    <YAxis dataKey="condition" type="category" width={180} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip rawData={rawData} selectedColumns={selectedColumns} />} />
                    {selectedColumns.map((column) => (
                      <Bar key={column} dataKey={column} stackId="a" fill={colors[column]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          ) : (
            <div className="text-center py-10">
              <p>No data to display. Please upload a file or check your filter settings.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface CustomTooltipProps extends Omit<TooltipProps<number, string>, "payload"> {
  payload?: Array<{
    name: string
    value: number
    color: string
  }>
  rawData: DataItem[]
  selectedColumns: string[]
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, rawData, selectedColumns }) => {
  if (active && payload && payload.length) {
    const firstCol = selectedColumns[0]
    const isNumeric = !isNaN(Number.parseFloat(rawData[0]?.[firstCol] || ""))

    return (
      <div className="bg-white p-2 border border-gray-300 rounded shadow">
        <p className="font-bold">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {isNumeric ? entry.value.toFixed(1) : `${(entry.value * 100).toFixed(1)}%`}
          </p>
        ))}
      </div>
    )
  }

  return null
}

