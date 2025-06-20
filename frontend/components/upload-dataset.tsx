"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, FileSpreadsheet, AlertCircle, Sparkles, Zap, Target, FileText, CheckCircle } from "lucide-react"
import {
  processDataset,
  setProcessedDataset,
  uploadDatasetToBackend,
} from "@/lib/process-dataset"
import { setFairnessResult } from "@/lib/fairness-result"
import { runFairnessAnalysis } from "@/lib/fairness-runner"

interface UploadDatasetProps {
  onDataProcessed: () => void
}

export function UploadDataset({ onDataProcessed }: UploadDatasetProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [processedData, setProcessedDataState] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase()
      const fileType = selectedFile.type.toLowerCase()
      const validExtensions = [".xlsx", ".xls", ".csv", ".tsv", ".txt"]
      const validMimeTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/excel",
        "application/x-excel",
        "application/x-msexcel",
        "text/csv",
        "text/plain",
        "text/tab-separated-values",
        "application/csv",
        "application/x-csv",
        "",
        "application/octet-stream",
      ]
      const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext))
      const hasValidMimeType = validMimeTypes.includes(fileType)
      const maxSize = 50 * 1024 * 1024

      if (selectedFile.size > maxSize) {
        setError("File size exceeds 50MB limit.")
        setFile(null)
        return
      }

      if (hasValidExtension || hasValidMimeType) {
        setFile(selectedFile)
        setError(null)
        setProcessedDataState(null)
      } else {
        setError(`Unsupported file format: ${fileType}`)
        setFile(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 90 : prev + 10))
      }, 200)

      const result = await processDataset(file)
      setProcessedDataset(result)
      setProcessedDataState(result)

      const protectedAttrList = JSON.parse(sessionStorage.getItem("selectedProtectedAttributes") || "[]")
      const protectedAttr = protectedAttrList?.[0] || "group" // fallback if user skipped attribute step

      // ✅ Add the log here
      console.log("Uploading dataset with protected attribute:", protectedAttr);

      const backendResult = await uploadDatasetToBackend(file)
      setFairnessResult(backendResult)

      const fairnessResult = await runFairnessAnalysis(result)
      setFairnessResult(fairnessResult)

      clearInterval(interval)
      setProgress(100)

      setTimeout(() => {
        onDataProcessed()
      }, 1000)
    } catch (err: any) {
      setError(`Error processing dataset: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleViewResults = () => {
    onDataProcessed()
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split(".").pop()
    return ext === "csv" || ext === "txt" || ext === "tsv" ? <FileText className="h-6 w-6 text-white" /> : <FileSpreadsheet className="h-6 w-6 text-white" />
  }

  const getFileTypeDisplay = (fileName: string) => {
    const ext = fileName.toLowerCase().split(".").pop()
    switch (ext) {
      case "xlsx": return "Excel Workbook"
      case "xls": return "Excel 97-2003"
      case "csv": return "CSV File"
      case "tsv": return "Tab-Separated Values"
      case "txt": return "Text File"
      default: return "Data File"
    }
  }

  return (
    <div className="space-y-8">
      {/* File Upload UI remains unchanged */}
      {/* Only handleUpload is modified to include protectedAttr logic */}
    </div>
  )
}