"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface GiskardReportProps {
  giskardReport: Record<
    string,
    {
      [severity: string]: string[]
    }
  >
}

function renderSeverityBadge(severity: string) {
  const base = "text-xs font-bold rounded-full px-2 py-0.5"
  switch (severity) {
    case "major":
      return <Badge className={`${base} bg-red-100 text-red-800`}>Major</Badge>
    case "medium":
      return <Badge className={`${base} bg-yellow-100 text-yellow-800`}>Medium</Badge>
    case "minor":
      return <Badge className={`${base} bg-blue-100 text-blue-800`}>Minor</Badge>
    default:
      return <Badge className={`${base} bg-gray-100 text-gray-700`}>{severity}</Badge>
  }
}

export const GiskardReportSection: React.FC<GiskardReportProps> = ({ giskardReport }) => {
  if (!giskardReport || Object.keys(giskardReport).length === 0) {
    return null
  }

  return (
    <div className="mt-10 space-y-8">
      <h2 className="text-xl font-semibold text-purple-800">⚖️ Giskard Fairness Audit</h2>

      {Object.entries(giskardReport).map(([detectorName, severityBuckets]) => (
        <Card key={detectorName} className="shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="mb-3 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">{detectorName}</h3>
              <span className="text-xs text-gray-500">Giskard Check</span>
            </div>

            {Object.entries(severityBuckets).map(([severity, messages]) => (
              <div key={severity} className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  {renderSeverityBadge(severity)}
                  <span className="text-sm text-gray-600">{messages.length} issue(s)</span>
                </div>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-4">
                  {messages.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
