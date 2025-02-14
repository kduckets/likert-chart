"use client"

import type React from "react"

import { useState } from "react"
import LikertChart from "./likert-chart"
import PivotChart from "./pivot-chart"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import * as XLSX from "xlsx"

interface DataItem {
  [key: string]: string
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

export default function DataDashboard() {
  const [headers, setHeaders] = useState<string[]>([])
  const [data, setData] = useState<DataItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)

    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const fileType = file.name.endsWith(".csv") ? "csv" : "excel"
        const { headers: parsedHeaders, data: parsedData } = parseFile(
          e.target?.result as string | ArrayBuffer,
          fileType,
        )

        setHeaders(parsedHeaders)
        setData(parsedData)
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

  return (
    <div className="space-y-8">
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
      </div>

      {headers.length > 0 && (
        <>
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Likert Chart</h2>
              <LikertChart headers={headers} data={data} />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Pivot Chart</h2>
              <PivotChart headers={headers} data={data} />
            </section>
          </div>
        </>
      )}
    </div>
  )
}

