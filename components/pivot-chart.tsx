"use client"

import { useState, useEffect, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronDown, ChevronUp } from "lucide-react"

interface DataItem {
  [key: string]: string | number
}

interface PivotConfig {
  rows: string[]
  columns: string[]
  values: string[]
}

interface FilterOption {
  column: string
  values: string[]
}

interface PivotChartProps {
  headers: string[]
  data: DataItem[]
}

const processData = (
  data: DataItem[],
  config: PivotConfig,
  filters: Record<string, string[]>,
): { rows: string[]; columns: string[]; values: number[][] } => {
  // Apply filters
  const filteredData = data.filter((item) => {
    return Object.entries(filters).every(([column, values]) => {
      if (values.length === 0) return true
      return values.includes(String(item[column]))
    })
  })

  // Get unique values for rows and columns
  const uniqueRows = Array.from(
    new Set(filteredData.map((item) => config.rows.map((row) => String(item[row])).join("|"))),
  )
  const uniqueColumns = Array.from(
    new Set(filteredData.map((item) => config.columns.map((col) => String(item[col])).join("|"))),
  )

  // Create the pivot table
  const pivotTable: Record<string, Record<string, number[]>> = {}

  filteredData.forEach((item) => {
    const rowKey = config.rows.map((row) => String(item[row])).join("|")
    const colKey = config.columns.map((col) => String(item[col])).join("|")

    if (!pivotTable[rowKey]) {
      pivotTable[rowKey] = {}
    }

    if (!pivotTable[rowKey][colKey]) {
      pivotTable[rowKey][colKey] = config.values.map(() => 0)
    }

    config.values.forEach((value, index) => {
      pivotTable[rowKey][colKey][index] += Number(item[value]) || 0
    })
  })

  // Convert pivot table to array format
  const values = uniqueRows.map((row) =>
    uniqueColumns.map((col) => pivotTable[row]?.[col] || config.values.map(() => 0)),
  )

  return {
    rows: uniqueRows,
    columns: uniqueColumns,
    values: values,
  }
}

const getFilterOptions = (data: DataItem[]): FilterOption[] => {
  const options: Record<string, Set<string>> = {}

  data.forEach((item) => {
    Object.entries(item).forEach(([key, value]) => {
      if (!options[key]) options[key] = new Set()
      if (value !== null && value !== undefined) options[key].add(String(value))
    })
  })

  return Object.entries(options).map(([column, values]) => ({
    column,
    values: Array.from(values).sort(),
  }))
}

export default function PivotChart({ headers, data }: PivotChartProps) {
  const [pivotConfig, setPivotConfig] = useState<PivotConfig>({
    rows: headers.length > 0 ? [headers[0]] : [],
    columns: headers.length > 1 ? [headers[1]] : [],
    values: headers.length > 2 ? [headers[2]] : [],
  })
  const [processedData, setProcessedData] = useState<{ rows: string[]; columns: string[]; values: number[][] }>({
    rows: [],
    columns: [],
    values: [],
  })
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [showFilters, setShowFilters] = useState(false)

  const filterOptions = useMemo(() => getFilterOptions(data), [data])

  useEffect(() => {
    if (pivotConfig.rows.length > 0 && pivotConfig.columns.length > 0 && pivotConfig.values.length > 0) {
      const timer = setTimeout(() => {
        try {
          const processed = processData(data, pivotConfig, filters)
          setProcessedData(processed)
        } catch (err) {
          console.error("Error processing data:", err)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [pivotConfig, data, filters])

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="rows">Rows</Label>
            <Select
              value={pivotConfig.rows[0]}
              onValueChange={(value) => setPivotConfig((prev) => ({ ...prev, rows: [value] }))}
            >
              <SelectTrigger id="rows">
                <SelectValue>{pivotConfig.rows[0]}</SelectValue>
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
            <Label htmlFor="columns">Columns</Label>
            <Select
              value={pivotConfig.columns[0]}
              onValueChange={(value) => setPivotConfig((prev) => ({ ...prev, columns: [value] }))}
            >
              <SelectTrigger id="columns">
                <SelectValue>{pivotConfig.columns[0]}</SelectValue>
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
            <Label htmlFor="values">Values</Label>
            <Select
              value={pivotConfig.values[0]}
              onValueChange={(value) => setPivotConfig((prev) => ({ ...prev, values: [value] }))}
            >
              <SelectTrigger id="values">
                <SelectValue>{pivotConfig.values[0]}</SelectValue>
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

      {processedData.rows.length > 0 ? (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{pivotConfig.rows[0]}</TableHead>
                {processedData.columns.map((col, index) => (
                  <TableHead key={index}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  <TableCell>{row}</TableCell>
                  {processedData.values[rowIndex].map((value, colIndex) => (
                    <TableCell key={colIndex}>{value[0].toFixed(2)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-10">
          <p>No data to display. Please check your pivot settings and filters.</p>
        </div>
      )}
    </div>
  )
}

