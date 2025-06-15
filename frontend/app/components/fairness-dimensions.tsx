"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, UserRound, PieChart, Shuffle, ArrowRight, ArrowLeft, Sparkles } from "lucide-react"

const fairnessDimensions = [
  {
    id: "group",
    name: "Group Fairness",
    description: "Ensures that protected groups receive similar treatment compared to other groups",
    icon: <Users className="h-6 w-6" />,
    color: "from-blue-500 to-cyan-500",
    metrics: [
      {
        id: "demographic_parity",
        name: "Demographic Parity",
        description: "Ensures equal selection rates across different demographic groups",
        complexity: "Basic",
      },
      {
        id: "equal_opportunity",
        name: "Equal Opportunity",
        description: "Ensures equal true positive rates across different demographic groups",
        complexity: "Intermediate",
      },
      {
        id: "predictive_parity",
        name: "Predictive Parity",
        description: "Ensures equal precision across different demographic groups",
        complexity: "Advanced",
      },
    ],
  },
  {
    id: "individual",
    name: "Individual Fairness",
    description: "Ensures that similar individuals receive similar treatment regardless of protected attributes",
    icon: <UserRound className="h-6 w-6" />,
    color: "from-emerald-500 to-teal-500",
    metrics: [
      {
        id: "consistency",
        name: "Consistency",
        description: "Measures if similar individuals receive similar predictions",
        complexity: "Intermediate",
      },
      {
        id: "counterfactual",
        name: "Counterfactual Fairness",
        description: "Ensures predictions remain the same when protected attributes change",
        complexity: "Advanced",
      },
    ],
  },
  {
    id: "subgroup",
    name: "Subgroup Fairness",
    description: "Ensures fairness across intersections of multiple protected attributes",
    icon: <PieChart className="h-6 w-6" />,
    color: "from-orange-500 to-red-500",
    metrics: [
      {
        id: "intersectional",
        name: "Intersectional Fairness",
        description: "Measures fairness across intersections of multiple protected attributes",
        complexity: "Advanced",
      },
      {
        id: "multicalibration",
        name: "Multicalibration",
        description: "Ensures calibration across all subgroups defined by protected attributes",
        complexity: "Expert",
      },
    ],
  },
  {
    id: "causal",
    name: "Causal Fairness",
    description: "Analyzes causal relationships between protected attributes and outcomes",
    icon: <Shuffle className="h-6 w-6" />,
    color: "from-violet-500 to-purple-500",
    metrics: [
      {
        id: "path_specific",
        name: "Path-specific Fairness",
        description: "Measures fairness along specific causal paths in the model",
        complexity: "Expert",
      },
      {
        id: "counterfactual_causal",
        name: "Counterfactual Causal Fairness",
        description: "Ensures fairness based on counterfactual causal reasoning",
        complexity: "Expert",
      },
    ],
  },
]

interface FairnessDimensionsProps {
  onContinue: () => void
}

export function FairnessDimensions({ onContinue }: FairnessDimensionsProps) {
  const [selectedDimension, setSelectedDimension] = useState("group")
  const [selectedMetrics, setSelectedMetrics] = useState<Record<string, string[]>>({
    group: ["demographic_parity"],
    individual: [],
    subgroup: [],
    causal: [],
  })

  const handleMetricToggle = (metricId: string) => {
    const currentMetrics = selectedMetrics[selectedDimension] || []

    if (currentMetrics.includes(metricId)) {
      setSelectedMetrics({
        ...selectedMetrics,
        [selectedDimension]: currentMetrics.filter((id) => id !== metricId),
      })
    } else {
      setSelectedMetrics({
        ...selectedMetrics,
        [selectedDimension]: [...currentMetrics, metricId],
      })
    }
  }

  const handleContinue = () => {
    onContinue()
  }

  const currentDimension = fairnessDimensions.find((d) => d.id === selectedDimension)

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "Basic":
        return "bg-green-100 text-green-700 border-green-200"
      case "Intermediate":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "Advanced":
        return "bg-orange-100 text-orange-700 border-orange-200"
      case "Expert":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl mb-4 shadow-lg">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Select Fairness Dimensions</h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Choose which dimensions of fairness to analyze in your dataset and select specific metrics for comprehensive
          evaluation.
        </p>
      </div>

      <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Dimension Selection */}
            <div className="lg:col-span-2">
              <h4 className="text-lg font-bold text-gray-800 mb-6">Fairness Dimensions</h4>
              <RadioGroup value={selectedDimension} onValueChange={setSelectedDimension} className="space-y-4">
                {fairnessDimensions.map((dimension) => (
                  <div key={dimension.id} className="group">
                    <div className="flex items-start space-x-3 p-4 rounded-xl border-2 border-transparent transition-all duration-300 hover:border-gray-200 hover:bg-gray-50">
                      <RadioGroupItem
                        value={dimension.id}
                        id={dimension.id}
                        className="mt-1 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-500 data-[state=checked]:border-0"
                      />
                      <Label htmlFor={dimension.id} className="flex-1 cursor-pointer">
                        <div className="flex items-start space-x-3">
                          <div className={`p-3 rounded-xl bg-gradient-to-r ${dimension.color} shadow-lg`}>
                            {dimension.icon}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800 mb-1">{dimension.name}</p>
                            <p className="text-sm text-gray-600 leading-relaxed">{dimension.description}</p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Metrics Selection */}
            <div className="lg:col-span-3">
              <Card className={`border-0 bg-gradient-to-br ${currentDimension?.color} shadow-lg`}>
                <CardContent className="p-6 text-white">
                  <div className="flex items-center mb-6">
                    <div className="p-2 bg-white/20 rounded-lg mr-3">{currentDimension?.icon}</div>
                    <h4 className="text-xl font-bold">{currentDimension?.name} Metrics</h4>
                  </div>

                  <div className="space-y-4">
                    {currentDimension?.metrics.map((metric) => (
                      <Card key={metric.id} className="border-0 bg-white/10 backdrop-blur-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id={metric.id}
                              checked={selectedMetrics[selectedDimension]?.includes(metric.id)}
                              onCheckedChange={() => handleMetricToggle(metric.id)}
                              className="mt-1 data-[state=checked]:bg-white data-[state=checked]:text-gray-800 data-[state=checked]:border-0"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <Label htmlFor={metric.id} className="font-semibold cursor-pointer text-white">
                                  {metric.name}
                                </Label>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium border ${getComplexityColor(metric.complexity)}`}
                                >
                                  {metric.complexity}
                                </span>
                              </div>
                              <p className="text-sm text-white/80 leading-relaxed">{metric.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/?tab=attributes")}
              className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Attributes
            </Button>
            <Button
              onClick={handleContinue}
              size="lg"
              className="bg-gradient-to-r from-violet-500 to-purple-500 px-8 py-3 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
            >
              Generate Bias Analysis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
