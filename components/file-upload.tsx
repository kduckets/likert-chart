"use client"

import type React from "react"

import { useState } from "react"
import { AlertCircle, Upload } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface FileUploadProps {
  onDataUpdate: (data: any[]) => void
}

export default function FileUpload({ onDataUpdate }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)

    if (!file) return

    if (file.type !== "text/csv") {
      setError("Please upload a CSV file")
      return
    }

    try {
      const text = await file.text()
      const rows = text.split("\n")
      const headers = rows[0].split(",")

      // Validate headers
      const requiredHeaders = ["id", "stronglyDisagree", "disagree", "agree", "stronglyAgree"]
      const hasValidHeaders = requiredHeaders.every((header) =>
        headers.map((h) => h.trim().toLowerCase()).includes(header.toLowerCase()),
      )

      if (!hasValidHeaders) {
        setError("CSV must include columns: id, stronglyDisagree, disagree, agree, stronglyAgree")
        return
      }

      const data = rows
        .slice(1)
        .map((row) => {
          const values = row.split(",")
          return {
            id: values[0],
            stronglyDisagree: Number.parseFloat(values[1]),
            disagree: Number.parseFloat(values[2]),
            agree: Number.parseFloat(values[3]),
            stronglyAgree: Number.parseFloat(values[4]),
          }
        })
        .filter((item) => !isNaN(item.stronglyDisagree))

      onDataUpdate(data)
    } catch (err) {
      setError("Error parsing CSV file. Please check the format.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input type="file" accept=".csv" onChange={handleFileUpload} className="max-w-sm" />
        <Button
          variant="outline"
          onClick={() => {
            const link = document.createElement("a")
            link.href =
              "data:text/csv;charset=utf-8,id,stronglyDisagree,disagree,agree,stronglyAgree\nSTAQ001,41,15,35,9\nSTAQ002,47,6,38,9"
            link.download = "sample.csv"
            link.click()
          }}
        >
          <Upload className="mr-2 h-4 w-4" />
          Download Sample CSV
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="text-sm text-muted-foreground">
        <p>CSV format should have the following columns:</p>
        <code className="block bg-muted p-2 mt-1 rounded-md">id,stronglyDisagree,disagree,agree,stronglyAgree</code>
      </div>
    </div>
  )
}

