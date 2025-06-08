"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, FileSpreadsheet, AlertCircle, Sparkles, Zap, Target, FileText, CheckCircle } from "lucide-react"
import { processDataset, setProcessedDataset } from "@/lib/process-dataset"

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
        setError("File size exceeds 50MB limit. Please upload a smaller file.")
        setFile(null)
        return
      }

      if (hasValidExtension || hasValidMimeType) {
        setFile(selectedFile)
        setError(null)
        setProcessedDataState(null) // Reset processed data
      } else {
        setError(
          `Unsupported file format. Please upload: Excel (.xlsx, .xls), CSV (.csv), or Text (.txt) files. 
          Detected file type: ${fileType || "unknown"}, File name: ${fileName}`,
        )
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
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const result = await processDataset(file)
      setProcessedDataset(result) // Store globally
      setProcessedDataState(result)

      setProgress(100)
      clearInterval(interval)

      // Small delay to show completion, then notify parent
      setTimeout(() => {
        onDataProcessed()
      }, 1000)
    } catch (err: any) {
      setError(`Error processing the dataset: ${err.message}`)
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleViewResults = () => {
    onDataProcessed()
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.toLowerCase().split(".").pop()
    if (extension === "csv" || extension === "txt" || extension === "tsv") {
      return <FileText className="h-6 w-6 text-white" />
    }
    return <FileSpreadsheet className="h-6 w-6 text-white" />
  }

  const getFileTypeDisplay = (fileName: string) => {
    const extension = fileName.toLowerCase().split(".").pop()
    switch (extension) {
      case "xlsx":
        return "Excel Workbook"
      case "xls":
        return "Excel 97-2003"
      case "csv":
        return "CSV File"
      case "tsv":
        return "Tab-Separated Values"
      case "txt":
        return "Text File"
      default:
        return "Data File"
    }
  }

  return (
    <div className="space-y-8">
      {/* Upload Area */}
      <div className="relative">
        {!file ? (
          <div
            className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-12 text-center transition-all duration-300 hover:border-blue-400 hover:shadow-lg cursor-pointer"
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="relative z-10">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg">
                <Upload className="h-10 w-10 text-white" />
              </div>

              <h3 className="mb-3 text-2xl font-bold text-gray-800">Upload your dataset</h3>
              <p className="mb-6 text-gray-600">Drag and drop your file here or click to browse</p>

              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/plain"
              />

              <Button
                size="lg"
                className="mb-4 bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-3 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
              >
                <FileSpreadsheet className="mr-2 h-5 w-5" />
                Browse Files
              </Button>

              <div className="text-sm text-gray-500 space-y-1">
                <p className="font-medium">Supported formats:</p>
                <p>📊 Excel: .xlsx, .xls</p>
                <p>📄 CSV: .csv</p>
                <p>📝 Text: .txt, .tsv</p>
                <p className="text-xs text-gray-400 mt-2">Maximum file size: 50MB</p>
              </div>
            </div>
          </div>
        ) : (
          <Card className="overflow-hidden border-0 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
                    {getFileIcon(file.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{file.name}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span>•</span>
                      <span>{getFileTypeDisplay(file.name)}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setProcessedDataState(null)
                  }}
                  disabled={uploading}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  Change File
                </Button>
              </div>

              {uploading ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {progress === 100 ? "Processing complete!" : "Analyzing your dataset..."}
                    </span>
                    <span className="font-bold text-emerald-600">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-3 bg-emerald-100" />
                  <div className="flex items-center justify-center text-sm text-gray-600">
                    <Sparkles className="mr-2 h-4 w-4 animate-pulse text-emerald-500" />
                    {progress < 50
                      ? "Reading file structure..."
                      : progress < 90
                        ? "Analyzing columns for bias patterns..."
                        : "Finalizing analysis..."}
                  </div>
                </div>
              ) : processedData ? (
                <div className="space-y-4">
                  <div className="flex items-center text-emerald-700 mb-4">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span className="font-medium">Analysis Complete!</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white/50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Rows:</span>
                      <span className="ml-2 text-gray-600">{processedData.data.rowCount}</span>
                    </div>
                    <div className="bg-white/50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Columns:</span>
                      <span className="ml-2 text-gray-600">{processedData.data.columnCount}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleViewResults}
                    size="lg"
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
                  >
                    <Zap className="mr-2 h-5 w-5" />
                    View Analysis Results
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleUpload}
                  size="lg"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
                >
                  <Zap className="mr-2 h-5 w-5" />
                  Analyze Dataset for Bias
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-gradient-to-r from-red-50 to-pink-50 shadow-lg">
          <div className="p-4">
            <div className="flex items-start">
              <AlertCircle className="mr-3 h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-red-700">
                <p className="font-medium mb-1">Upload Error</p>
                <p className="text-sm whitespace-pre-line">{error}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Process Overview */}
      <Card className="border-0 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg">
        <div className="p-6">
          <h4 className="mb-6 flex items-center text-lg font-bold text-gray-800">
            <Target className="mr-2 h-5 w-5 text-indigo-600" />
            What happens next?
          </h4>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg">
                <span className="text-sm font-bold">1</span>
              </div>
              <div>
                <h5 className="font-semibold text-gray-800">Smart Analysis</h5>
                <p className="text-sm text-gray-600">
                  AI analyzes your actual dataset columns to identify potential protected attributes
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg">
                <span className="text-sm font-bold">2</span>
              </div>
              <div>
                <h5 className="font-semibold text-gray-800">Attribute Confirmation</h5>
                <p className="text-sm text-gray-600">
                  Review and confirm which of your columns should be considered protected
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
                <span className="text-sm font-bold">3</span>
              </div>
              <div>
                <h5 className="font-semibold text-gray-800">Fairness Dimensions</h5>
                <p className="text-sm text-gray-600">
                  Select fairness dimensions to analyze (group fairness, individual bias, etc.)
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg">
                <span className="text-sm font-bold">4</span>
              </div>
              <div>
                <h5 className="font-semibold text-gray-800">Comprehensive Report</h5>
                <p className="text-sm text-gray-600">
                  View detailed bias metrics, visualizations, and actionable recommendations
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
