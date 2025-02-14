"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Bar, BarChart, XAxis, YAxis, Tooltip, type TooltipProps, ResponsiveContainer } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, ChevronUp } from "lucide-react"

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

interface LikertChartProps {
  headers: string[]
  data: DataItem[]
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

export default function LikertChart({ headers, data }: LikertChartProps) {
  const [conditionColumn, setConditionColumn] = useState<string>(headers[0] || "")
  const [selectedColumns, setSelectedColumns] = useState<string[]>(headers.slice(1, 4))
  const [processedData, setProcessedData] = useState<ProcessedDataItem[]>([])
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [showFilters, setShowFilters] = useState(false)

  const filterOptions = useMemo(() => getFilterOptions(data), [data])

  useEffect(() => {
    if (conditionColumn && selectedColumns.length > 0) {
      const timer = setTimeout(() => {
        try {
          const processed = processData(data, conditionColumn, selectedColumns, filters)
          setProcessedData(processed)
        } catch (err) {
          console.error("Error processing data:", err)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [selectedColumns, conditionColumn, data, filters])

  const colors = ["hsl(43, 74%, 66%)", "hsl(168, 42%, 73%)", "hsl(220, 14%, 80%)"]

  const chartConfig = Object.fromEntries(selectedColumns.map((col, i) => [col, { color: colors[i % colors.length] }]))

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div>
          <Label htmlFor="condition-column">Condition Column</Label>
          <Select value={conditionColumn} onValueChange={setConditionColumn}>
            <SelectTrigger id="condition-column">
              <SelectValue>{conditionColumn}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {headers.map((col) => (
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

      {processedData.length > 0 ? (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <ChartContainer className="h-[800px] p-4" config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={processedData}
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
                    const isNumeric = !isNaN(Number.parseFloat(data[0]?.[firstCol] || ""))
                    return isNumeric ? value.toFixed(1) : `${(value * 100).toFixed(1)}%`
                  }}
                />
                <YAxis dataKey="condition" type="category" width={180} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip rawData={data} selectedColumns={selectedColumns} />} />
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
          <p>No data to display. Please check your column selections and filter settings.</p>
        </div>
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
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-bold text-base border-b pb-2 mb-2">{label}</p>
        {payload.map((entry, index) => {
          const value = isNumeric ? entry.value.toFixed(1) : `${(entry.value * 100).toFixed(1)}%`

          // Format the entry name to be more readable
          const formattedName = entry.name
            .replace(/([A-Z])/g, " $1") // Add space before capital letters
            .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter

          return (
            <div key={index} className="flex items-center justify-between gap-4 py-1">
              <span className="text-sm text-gray-600">{formattedName}:</span>
              <span className="font-medium" style={{ color: entry.color }}>
                {value}
              </span>
            </div>
          )
        })}
        {/* Add total if showing percentages */}
        {!isNumeric && (
          <div className="border-t mt-2 pt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="font-medium">{payload.reduce((sum, entry) => sum + entry.value, 0).toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}

