"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { ChartContainer } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, ChevronUp, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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

  const filteredData = data.filter((item) => {
    return Object.entries(filters).every(([column, values]) => {
      if (!values || values.length === 0) return true
      const itemValue = item[column]?.trim()
      return itemValue && values.includes(itemValue)
    })
  })

  const uniqueResponses = Array.from(new Set(filteredData.map((item) => item[responseColumn])))
    .filter(Boolean)
    .sort()

  if (uniqueResponses.length < 2) {
    console.error("Not enough unique responses to create a comparison")
    return { data: [], categories: { left: "", right: "" } }
  }

  const [leftCategory, rightCategory] = uniqueResponses

  const stats: Record<string, { left: number; right: number; total: number }> = {}

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
    .sort((a, b) => b.total - a.total)

  return {
    data: processedData,
    categories: {
      left: leftCategory,
      right: rightCategory,
    },
  }
}

const getFilterOptions = (data: DataItem[], conditionColumn: string, responseColumn: string): FilterOption[] => {
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
    .filter(([_, values]) => values.size > 1)
    .map(([column, values]) => ({
      column,
      values: Array.from(values).sort(),
    }))
}

const COLORS = {
  left: "#6366f1", // Indigo
  right: "#8b5cf6", // Purple
}

export default function LikertChart({ headers, data }: LikertChartProps) {
  const [conditionColumn, setConditionColumn] = useState<string>(headers[0] || "")
  const [responseColumn, setResponseColumn] = useState<string>("")
  const [processedData, setProcessedData] = useState<ProcessedDataItem[]>([])
  const [categories, setCategories] = useState<{ left: string; right: string }>({ left: "", right: "" })
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [showFilters, setShowFilters] = useState(false)

  const filterOptions = useMemo(
    () => getFilterOptions(data, conditionColumn, responseColumn),
    [data, conditionColumn, responseColumn],
  )

  useEffect(() => {
    setFilters({})
  }, []) // Updated dependency array

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

  const activeFilters = Object.entries(filters).filter(([_, values]) => values.length > 0)

  return (
    <div className="space-y-6 p-6 bg-white rounded-xl shadow-lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="condition-column" className="text-sm font-medium text-gray-700">
              Condition Column
            </Label>
            <Select value={conditionColumn} onValueChange={setConditionColumn}>
              <SelectTrigger id="condition-column" className="mt-1">
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
            <Label htmlFor="response-column" className="text-sm font-medium text-gray-700">
              Response Column
            </Label>
            <Select value={responseColumn} onValueChange={setResponseColumn}>
              <SelectTrigger id="response-column" className="mt-1">
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

        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full mt-4 bg-gray-50 hover:bg-gray-100 text-gray-700"
        >
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

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-4 mt-4">
                {filterOptions.map((option) => (
                  <div key={option.column} className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{option.column}</Label>
                    <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
                      {option.values.map((value) => (
                        <div key={value} className="flex items-center space-x-2 py-1">
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
                          <Label htmlFor={`${option.column}-${value}`} className="text-sm text-gray-600">
                            {value}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {activeFilters.map(([column, values]) =>
              values.map((value) => (
                <Badge key={`${column}-${value}`} variant="secondary" className="text-xs">
                  {column}: {value}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => {
                      setFilters((prev) => ({
                        ...prev,
                        [column]: prev[column].filter((v) => v !== value),
                      }))
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )),
            )}
          </div>
        )}
      </div>

      {processedData.length > 0 ? (
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <ChartContainer className="h-[800px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={processedData}
                layout="vertical"
                margin={{
                  top: 40,
                  right: 60,
                  bottom: 20,
                  left: 240,
                }}
                barSize={20}
                barGap={0}
                stackOffset="sign"
              >
                <XAxis
                  type="number"
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => `${Math.abs(value)}`}
                  stroke="#888"
                  fontSize={12}
                  tickCount={5}
                />
                <XAxis type="number" orientation="top" tickFormatter={() => ""} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="condition"
                  type="category"
                  width={220}
                  tick={({ x, y, payload }) => (
                    <g transform={`translate(${x},${y})`}>
                      <text x={-10} y={0} dy={4} textAnchor="end" fill="#333" fontSize={12} fontWeight={500}>
                        {payload.value.length > 40 ? payload.value.substring(0, 40) + "..." : payload.value}
                      </text>
                    </g>
                  )}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip categories={categories} />} />
                <ReferenceLine x={0} stroke="#888" />
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
                <text x="48%" y={15} textAnchor="end" fill="#333" fontSize={14} fontWeight={500}>
                  {categories.left}
                </text>
                <text x="52%" y={15} textAnchor="start" fill="#333" fontSize={14} fontWeight={500}>
                  {categories.right}
                </text>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500">
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
      <div className="bg-white p-4 border rounded-lg shadow-lg">
        <p className="font-semibold text-base border-b pb-2 mb-2 text-gray-800">{data.condition}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600">{categories.left}:</span>
            <span className="font-medium" style={{ color: COLORS.left }}>
              {Math.abs(data.leftValue)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600">{categories.right}:</span>
            <span className="font-medium" style={{ color: COLORS.right }}>
              {data.rightValue}
            </span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-gray-700">Total responses:</span>
              <span className="font-medium text-gray-900">{data.total}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return null
}

