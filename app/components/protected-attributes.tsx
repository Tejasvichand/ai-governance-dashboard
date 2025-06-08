"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Info, AlertTriangle, Shield, Eye, ArrowRight, FileText } from "lucide-react"
import { getProcessedDataset } from "@/lib/process-dataset"

interface ProtectedAttributesProps {
  onContinue: () => void
}

export function ProtectedAttributes({ onContinue }: ProtectedAttributesProps) {
  const [attributes, setAttributes] = useState<any[]>([])
  const [datasetInfo, setDatasetInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get the processed dataset
    const processedData = getProcessedDataset()
    console.log("Protected Attributes - Processed Data:", processedData)

    if (processedData?.data) {
      setAttributes(processedData.data.identifiedAttributes)
      setDatasetInfo(processedData.data)
    }
    setLoading(false)
  }, [])

  const toggleAttribute = (index: number) => {
    const newAttributes = [...attributes]
    newAttributes[index].isProtected = !newAttributes[index].isProtected
    setAttributes(newAttributes)
  }

  const handleContinue = () => {
    onContinue()
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "from-red-500 to-pink-500"
      case "medium":
        return "from-yellow-500 to-orange-500"
      case "low":
        return "from-green-500 to-emerald-500"
      default:
        return "from-gray-500 to-slate-500"
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-emerald-600 bg-emerald-50"
    if (confidence >= 0.8) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dataset analysis...</p>
        </div>
      </div>
    )
  }

  if (!datasetInfo || !attributes.length) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">No Dataset Analysis Found</h3>
        <p className="text-gray-600 mb-4">
          It looks like your dataset hasn't been processed yet. Please go back and upload a dataset first.
        </p>
        <Button onClick={() => (window.location.href = "/?tab=upload")}>Go Back to Upload</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Info Banner */}
      <Card className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg">
              <Info className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="mb-2 text-lg font-bold text-blue-800">Analysis Results for Your Dataset</h4>
              <p className="text-blue-700 leading-relaxed">
                We've analyzed your uploaded CSV file and identified potential protected attributes based on column
                names, data patterns, and statistical analysis. Your dataset contains{" "}
                <strong>{datasetInfo.columnCount} columns</strong> and <strong>{datasetInfo.rowCount} rows</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dataset Preview */}
      <Card className="border-0 bg-gradient-to-r from-gray-50 to-slate-50 shadow-lg">
        <CardContent className="p-6">
          <h4 className="text-lg font-bold text-gray-800 mb-4">Your Dataset Columns</h4>
          <div className="flex flex-wrap gap-2">
            {datasetInfo.columns.map((column: string, index: number) => (
              <Badge key={index} variant="outline" className="bg-white text-gray-700 border-gray-300">
                {column}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Total Columns</p>
                <p className="text-3xl font-bold text-emerald-800">{attributes.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
                <Eye className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-50 to-red-50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">High Risk Attributes</p>
                <p className="text-3xl font-bold text-orange-800">
                  {attributes.filter((attr) => attr.riskLevel === "high").length}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-violet-50 to-purple-50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-violet-700">Selected for Analysis</p>
                <p className="text-3xl font-bold text-violet-800">
                  {attributes.filter((attr) => attr.isProtected).length}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attributes Table */}
      <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="overflow-hidden rounded-xl">
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">Detected Protected Attributes</h3>
              <p className="text-sm text-gray-600 mt-1">
                Review and confirm which attributes should be considered for fairness analysis
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="w-[60px] font-semibold">Select</TableHead>
                    <TableHead className="font-semibold">Attribute</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Sample Values</TableHead>
                    <TableHead className="font-semibold">Risk Level</TableHead>
                    <TableHead className="text-right font-semibold">AI Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attributes.map((attr, index) => (
                    <TableRow key={attr.name} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={attr.isProtected}
                          onCheckedChange={() => toggleAttribute(index)}
                          id={`attr-${index}`}
                          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-500 data-[state=checked]:border-0"
                        />
                      </TableCell>
                      <TableCell>
                        <label htmlFor={`attr-${index}`} className="cursor-pointer font-semibold text-gray-800">
                          {attr.name}
                        </label>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {attr.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm font-mono">
                        {attr.examples.join(", ")}
                        {attr.range && <div className="text-xs text-gray-500">Range: {attr.range}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`bg-gradient-to-r ${getRiskColor(attr.riskLevel)} text-white border-0 shadow-sm`}
                        >
                          {attr.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {attr.confidence < 0.8 && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                          <Badge className={`${getConfidenceColor(attr.confidence)} border-0 font-semibold`}>
                            {Math.round(attr.confidence * 100)}%
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          size="lg"
          className="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
        >
          Continue to Fairness Analysis
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
