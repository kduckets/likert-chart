"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Bar, BarChart, XAxis, YAxis, Tooltip, type TooltipProps, ResponsiveContainer } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import * as XLSX from "xlsx"

interface DataItem {
  [key: string]: string
}

interface ProcessedDataItem {
  condition: string
  [key: string]: string | number
}

interface FilterOption {
  column: string
  values: string[]
}

const parseFile = (
  result: string | ArrayBuffer,
  fileType: "csv" | "excel",
): { headers: string[]; data: DataItem[] } => {
  if (fileType === "csv") {
    const lines = (result as string).split("\n")
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
  } else {
    const workbook = XLSX.read(result, { type: "binary" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rawJsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 })

    const headers = (rawJsonData[0] as string[]).map((h) => h.trim())
    const data = (rawJsonData.slice(1) as any[])
      .map((row) => {
        const item: DataItem = {}
        headers.forEach((header, index) => {
          item[header] = row[index]?.toString() || ""
        })
        return item
      })
      .filter((item) => Object.values(item).some((v) => v))
    return { headers, data }
  }
}

const processData = (
  data: DataItem[],
  conditionColumn: string,
  selectedColumns: string[],
  filters: Record<string, string[]>,
): ProcessedDataItem[] => {
  if (!data || data.length === 0) return []

  // Apply filters
  const filteredData = data.filter((item) => {
    return Object.entries(filters).every(([column, values]) => {
      if (values.length === 0) return true
      return values.includes(item[column])
    })
  })

  const conditionCounts: { [key: string]: { total: number; counts: { [key: string]: number } } } = {}

  filteredData.forEach((item) => {
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

const getFilterOptions = (data: DataItem[]): FilterOption[] => {
  const options: Record<string, Set<string>> = {}

  data.forEach((item) => {
    Object.entries(item).forEach(([key, value]) => {
      if (!options[key]) options[key] = new Set()
      if (value) options[key].add(value)
    })
  })

  return Object.entries(options).map(([column, values]) => ({
    column,
    values: Array.from(values).sort(),
  }))
}

export default function LikertChart() {
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [conditionColumn, setConditionColumn] = useState<string>("")
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [rawData, setRawData] = useState<DataItem[]>([])
  const [data, setData] = useState<ProcessedDataItem[]>([])
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const filterOptions = useMemo(() => getFilterOptions(rawData), [rawData])

  useEffect(() => {
    if (conditionColumn && selectedColumns.length > 0) {
      const timer = setTimeout(() => {
        try {
          const processedData = processData(rawData, conditionColumn, selectedColumns, filters)
          setData(processedData)
        } catch (err) {
          console.error("Error processing data:", err)
          setError("Error processing data. Please check the console for details.")
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [selectedColumns, conditionColumn, rawData, filters])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)

    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const fileType = file.name.endsWith(".csv") ? "csv" : "excel"
        const { headers, data } = parseFile(e.target?.result as string | ArrayBuffer, fileType)

        setAvailableColumns(headers)
        setConditionColumn(headers[0])
        setSelectedColumns(headers.slice(1, 4))
        setRawData(data)
        setFilters({})
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

  const colors = ["hsl(43, 74%, 66%)", "hsl(168, 42%, 73%)", "hsl(220, 14%, 80%)"]

  const chartConfig = Object.fromEntries(selectedColumns.map((col, i) => [col, { color: colors[i % colors.length] }]))

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

            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="w-full">
              {showFilters ? (
                <>
                  Hide Filters
                  <ChevronUp className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Show Filters
                  <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {showFilters && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {filterOptions.map((option) => (
                  <div key={option.column} className="space-y-2">
                    <Label>{option.column}</Label>
                    <div className="max-h-40 overflow-y-auto border rounded p-2">
                      {option.values.map((value) => (
                        <div key={value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${option.column}-${value}`}
                            checked={filters[option.column]?.includes(value)}
                            onCheckedChange={(checked) => {
                              setFilters((prev) => {
                                const newFilters = { ...prev }
                                if (!newFilters[option.column]) {
                                  newFilters[option.column] = []
                                }
                                if (checked) {
                                  newFilters[option.column].push(value)
                                } else {
                                  newFilters[option.column] = newFilters[option.column].filter((v) => v !== value)
                                }
                                return newFilters
                              })
                            }}
                          />
                          <Label htmlFor={`${option.column}-${value}`}>{value}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                      <Bar
                        key={column}
                        dataKey={column}
                        stackId="a"
                        fill={colors[selectedColumns.indexOf(column) % colors.length]}
                      />
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

