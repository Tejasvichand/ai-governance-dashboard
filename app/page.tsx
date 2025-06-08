"use client"

import { useState, useEffect } from "react"
import { UploadDataset } from "./components/upload-dataset"
import { ProtectedAttributes } from "./components/protected-attributes"
import { FairnessDimensions } from "./components/fairness-dimensions"
import { BiasMetrics } from "./components/bias-metrics"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Brain, BarChart3, FileSpreadsheet } from "lucide-react"
import { getProcessedDataset } from "@/lib/process-dataset"

export default function Home() {
  const [activeTab, setActiveTab] = useState("upload")
  const [hasProcessedData, setHasProcessedData] = useState(false)

  useEffect(() => {
    // Check if we have processed data on component mount
    const processedData = getProcessedDataset()
    if (processedData?.data) {
      setHasProcessedData(true)
    }

    // Check URL parameters for tab navigation
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get("tab")
    if (tabParam && ["upload", "attributes", "fairness", "metrics"].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Update URL without page reload
    const url = new URL(window.location.href)
    url.searchParams.set("tab", value)
    window.history.pushState({}, "", url.toString())
  }

  const handleDataProcessed = () => {
    setHasProcessedData(true)
    setActiveTab("attributes")
    // Update URL
    const url = new URL(window.location.href)
    url.searchParams.set("tab", "attributes")
    window.history.pushState({}, "", url.toString())
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto py-8 px-4">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
            AI/LLM Governance Dashboard
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Upload your dataset, identify protected attributes, and analyze fairness metrics to ensure ethical AI
            systems with comprehensive bias detection.
          </p>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-2xl grid-cols-4 h-14 bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg rounded-2xl p-2">
              <TabsTrigger
                value="upload"
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </TabsTrigger>
              <TabsTrigger
                value="attributes"
                disabled={!hasProcessedData}
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Attributes</span>
              </TabsTrigger>
              <TabsTrigger
                value="fairness"
                disabled={!hasProcessedData}
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">Fairness</span>
              </TabsTrigger>
              <TabsTrigger
                value="metrics"
                disabled={!hasProcessedData}
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Metrics</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upload" className="space-y-6">
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <FileSpreadsheet className="h-6 w-6" />
                  Upload Dataset
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Upload a CSV file containing your dataset for comprehensive bias and fairness analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <UploadDataset onDataProcessed={handleDataProcessed} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attributes" className="space-y-6">
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Shield className="h-6 w-6" />
                  Protected Attributes
                </CardTitle>
                <CardDescription className="text-emerald-100">
                  Review and confirm the identified protected attributes in your dataset.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <ProtectedAttributes onContinue={() => handleTabChange("fairness")} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fairness" className="space-y-6">
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Brain className="h-6 w-6" />
                  Fairness Dimensions
                </CardTitle>
                <CardDescription className="text-orange-100">
                  Select and analyze different dimensions of fairness for comprehensive evaluation.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <FairnessDimensions onContinue={() => handleTabChange("metrics")} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <BarChart3 className="h-6 w-6" />
                  Bias Metrics Analysis
                </CardTitle>
                <CardDescription className="text-violet-100">
                  View detailed metrics and insights based on your selected fairness dimensions.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <BiasMetrics />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
