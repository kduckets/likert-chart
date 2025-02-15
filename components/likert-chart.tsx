"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
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
  leftValue: number
  rightValue: number
  leftLabel: string
  rightLabel: string
  total: number
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
  responseColumn: string,
  filters: Record<string, string[]>,
): { data: ProcessedDataItem[]; categories: { left: string; right: string } } => {
  if (!data || data.length === 0 || !responseColumn) return { data: [], categories: { left: "", right: "" } }

  // Apply filters
  const filteredData = data.filter((item) => {
    return Object.entries(filters).every(([column, values]) => {
      if (!values || values.length === 0) return true
      const itemValue = item[column]?.trim()
      return itemValue && values.includes(itemValue)
    })
  })

  // Get unique response values
  const uniqueResponses = Array.from(new Set(filteredData.map((item) => item[responseColumn])))
    .filter(Boolean)
    .sort()

  if (uniqueResponses.length < 2) {
    console.error("Not enough unique responses to create a comparison")
    return { data: [], categories: { left: "", right: "" } }
  }

  const [leftCategory, rightCategory] = uniqueResponses

  const stats: Record<
    string,
    {
      left: number
      right: number
      total: number
    }
  > = {}

  filteredData.forEach((item) => {
    const condition = item[conditionColumn]
    const response = item[responseColumn]

    if (!condition || !response) return

    if (!stats[condition]) {
      stats[condition] = { left: 0, right: 0, total: 0 }
    }

    stats[condition].total++

    if (response === leftCategory) {
      stats[condition].left++
    } else if (response === rightCategory) {
      stats[condition].right++
    }
  })

  const processedData = Object.entries(stats)
    .map(([condition, counts]) => ({
      condition,
      leftValue: -counts.left,
      rightValue: counts.right,
      leftLabel: leftCategory,
      rightLabel: rightCategory,
      total: counts.total,
    }))
    .sort((a, b) => b.total - a.total) // Sort by total count instead

  return {
    data: processedData,
    categories: {
      left: leftCategory,
      right: rightCategory,
    },
  }
}

const getFilterOptions = (data: DataItem[]): FilterOption[] => {
  // Skip the columns used for condition and response
  const skipColumns = new Set([conditionColumn, responseColumn])
  const options: Record<string, Set<string>> = {}

  data.forEach((item) => {
    Object.entries(item).forEach(([key, value]) => {
      if (!skipColumns.has(key) && value && value.trim() !== "") {
        if (!options[key]) options[key] = new Set()
        options[key].add(value.trim())
      }
    })
  })

  return Object.entries(options)
    .filter(([_, values]) => values.size > 1) // Only include columns with multiple values
    .map(([column, values]) => ({
      column,
      values: Array.from(values).sort(),
    }))
}

const COLORS = {
  left: "#e3c19a", // Softer peach/tan color
  right: "#7fb5b5", // Muted teal color
}

export default function LikertChart({ headers, data }: LikertChartProps) {
  const [conditionColumn, setConditionColumn] = useState<string>(headers[0] || "")
  const [responseColumn, setResponseColumn] = useState<string>("")
  const [processedData, setProcessedData] = useState<ProcessedDataItem[]>([])
  const [categories, setCategories] = useState<{ left: string; right: string }>({ left: "", right: "" })
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [showFilters, setShowFilters] = useState(false)

  const filterOptions = useMemo(() => getFilterOptions(data), [data])

  useEffect(() => {
    setFilters({})
  }, [conditionColumn, responseColumn])

  useEffect(() => {
    if (conditionColumn && responseColumn) {
      const timer = setTimeout(() => {
        try {
          const result = processData(data, conditionColumn, responseColumn, filters)
          setProcessedData(result.data)
          setCategories(result.categories)
        } catch (err) {
          console.error("Error processing data:", err)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [responseColumn, conditionColumn, data, filters])

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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

          <div>
            <Label htmlFor="response-column">Compare Column</Label>
            <Select value={responseColumn} onValueChange={setResponseColumn}>
              <SelectTrigger id="response-column">
                <SelectValue>{responseColumn}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {headers
                  .filter((header) => header !== conditionColumn)
                  .map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
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
          <ChartContainer className="h-[800px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={processedData}
                layout="vertical"
                margin={{
                  top: 20,
                  right: 60,
                  bottom: 20,
                  left: 240,
                }}
                barSize={20}
                barGap={0}
                stackOffset="sign"
              >
                <XAxis type="number" domain={["auto", "auto"]} tickFormatter={(value) => `${Math.abs(value)}`} />
                <YAxis
                  dataKey="condition"
                  type="category"
                  width={220}
                  tick={({ x, y, payload }) => (
                    <g transform={`translate(${x},${y})`}>
                      <text x={-10} y={0} dy={4} textAnchor="end" fill="hsl(var(--foreground))" fontSize={12}>
                        {payload.value.length > 40 ? payload.value.substring(0, 40) + "..." : payload.value}
                      </text>
                    </g>
                  )}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip categories={categories} />} />
                <ReferenceLine x={0} stroke="#666" />

                <Bar stackId="stack" dataKey="leftValue" fill={COLORS.left} name={categories.left}>
                  {processedData.map((entry, index) => (
                    <Cell key={`left-${index}`} fill={COLORS.left} />
                  ))}
                </Bar>
                <Bar stackId="stack" dataKey="rightValue" fill={COLORS.right} name={categories.right}>
                  {processedData.map((entry, index) => (
                    <Cell key={`right-${index}`} fill={COLORS.right} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      ) : (
        <div className="text-center py-10">
          <p>Please select both a condition column and a response column to display the chart.</p>
        </div>
      )}
    </div>
  )
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload: ProcessedDataItem
  }>
  label?: string
  categories: {
    left: string
    right: string
  }
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, categories }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background p-4 border rounded-lg shadow-lg">
        <p className="font-semibold text-base border-b pb-2 mb-2">{data.condition}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">{categories.left}:</span>
            <span className="font-medium" style={{ color: COLORS.left }}>
              {Math.abs(data.leftValue)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">{categories.right}:</span>
            <span className="font-medium" style={{ color: COLORS.right }}>
              {data.rightValue}
            </span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Total responses:</span>
              <span className="font-medium">{data.total}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return null
}

