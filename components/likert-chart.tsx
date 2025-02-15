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
import { ChevronDown, ChevronUp, X, Moon, Sun } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "next-themes"

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
  light: {
    left: "#6366f1", // Indigo
    right: "#8b5cf6", // Purple
    text: "#333333",
    background: "#ffffff",
  },
  dark: {
    left: "#818cf8", // Lighter Indigo
    right: "#a78bfa", // Lighter Purple
    text: "#e5e5e5",
    background: "#1f2937",
  },
}

export default function LikertChart({ headers, data }: LikertChartProps) {
  const [conditionColumn, setConditionColumn] = useState<string>(headers[0] || "")
  const [responseColumn, setResponseColumn] = useState<string>("")
  const [processedData, setProcessedData] = useState<ProcessedDataItem[]>([])
  const [categories, setCategories] = useState<{ left: string; right: string }>({ left: "", right: "" })
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [showFilters, setShowFilters] = useState(false)
  const { theme, setTheme } = useTheme()

  const filterOptions = useMemo(
    () => getFilterOptions(data, conditionColumn, responseColumn),
    [data, conditionColumn, responseColumn],
  )

  useEffect(() => {
    setFilters({})
  }, []) // Removed conditionColumn dependency

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

  const currentColors = theme === "dark" ? COLORS.dark : COLORS.light

  const ColorKey = () => (
    <div className="flex justify-center items-center space-x-4 mb-4">
      <div className="flex items-center">
        <div className={`w-4 h-4 mr-2 rounded`} style={{ backgroundColor: currentColors.left }}></div>
        <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>{categories.left}</span>
      </div>
      <div className="flex items-center">
        <div className={`w-4 h-4 mr-2 rounded`} style={{ backgroundColor: currentColors.right }}></div>
        <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>{categories.right}</span>
      </div>
    </div>
  )

  return (
    <div
      className={`space-y-6 p-6 rounded-xl shadow-lg ${theme === "dark" ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"}`}
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Likert Chart</h2>
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label
              htmlFor="condition-column"
              className={`text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}
            >
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
            <Label
              htmlFor="response-column"
              className={`text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}
            >
              Compare Column
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
          className={`w-full mt-4 ${theme === "dark" ? "bg-gray-700 hover:bg-gray-600 text-gray-100" : "bg-gray-50 hover:bg-gray-100 text-gray-700"}`}
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
                    <Label className={`text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                      {option.column}
                    </Label>
                    <div
                      className={`max-h-40 overflow-y-auto border rounded-md p-2 ${theme === "dark" ? "bg-gray-700" : "bg-gray-50"}`}
                    >
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
                          <Label
                            htmlFor={`${option.column}-${value}`}
                            className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
                          >
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
                <Badge
                  key={`${column}-${value}`}
                  variant="secondary"
                  className={`text-xs ${theme === "dark" ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}
                >
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

      <ColorKey />
      {processedData.length > 0 ? (
        <div
          className={`rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-sm overflow-hidden`}
        >
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
                <XAxis
                  type="number"
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => `${Math.abs(value)}`}
                  stroke={currentColors.text}
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
                      <text
                        x={-10}
                        y={0}
                        dy={4}
                        textAnchor="end"
                        fill={currentColors.text}
                        fontSize={12}
                        fontWeight={500}
                      >
                        {payload.value.length > 40 ? payload.value.substring(0, 40) + "..." : payload.value}
                      </text>
                    </g>
                  )}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip categories={categories} theme={theme} />} />
                <ReferenceLine x={0} stroke={theme === "dark" ? "#555" : "#888"} />
                <Bar stackId="stack" dataKey="leftValue" fill={currentColors.left} name={categories.left}>
                  {processedData.map((entry, index) => (
                    <Cell key={`left-${index}`} fill={currentColors.left} />
                  ))}
                </Bar>
                <Bar stackId="stack" dataKey="rightValue" fill={currentColors.right} name={categories.right}>
                  {processedData.map((entry, index) => (
                    <Cell key={`right-${index}`} fill={currentColors.right} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      ) : (
        <div className={`text-center py-10 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
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
  theme?: string
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, categories, theme }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const currentColors = theme === "dark" ? COLORS.dark : COLORS.light
    return (
      <div
        className={`p-4 border rounded-lg shadow-lg ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-800"}`}
      >
        <p
          className={`font-semibold text-base border-b pb-2 mb-2 ${theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-300 text-gray-800"}`}
        >
          {data.condition}
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              {categories.left}:
            </span>
            <span className="font-medium" style={{ color: currentColors.left }}>
              {Math.abs(data.leftValue)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              {categories.right}:
            </span>
            <span className="font-medium" style={{ color: currentColors.right }}>
              {data.rightValue}
            </span>
          </div>
          <div className={`border-t pt-2 mt-2 ${theme === "dark" ? "border-gray-700" : "border-gray-300"}`}>
            <div className="flex items-center justify-between gap-4">
              <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Total responses:
              </span>
              <span className={`font-medium ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                {data.total}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return null
}

