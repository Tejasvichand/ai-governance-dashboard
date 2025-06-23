// components/GiskardReportSection.tsx
"use client";

import { useEffect, useState } from "react";
import { getFairnessResult } from "@/lib/process-dataset";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DetectorResult {
  [severity: string]: string[];
}

interface GiskardReport {
  [detector: string]: DetectorResult;
}

export function GiskardReportSection() {
  const [report, setReport] = useState<GiskardReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const result = getFairnessResult();
      if (!result || !result.giskard_report) {
        setError("Giskard results not found. Please run a scan first.");
        return;
      }
      setReport(result.giskard_report);
    } catch (err) {
      console.error("Error parsing Giskard report:", err);
      setError("Failed to load Giskard report.");
    }
  }, []);

  const severities = ["major", "medium", "minor"];

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        Giskard Fairness Report Summary
      </h3>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-lg">
          <AlertTriangle className="inline w-4 h-4 mr-2" /> {error}
        </div>
      )}

      {report && (
        <div className="grid gap-6">
          {Object.entries(report).map(([detector, details]) => (
            <Card key={detector} className="border border-gray-200 shadow-sm">
              <CardContent className="p-5">
                <h4 className="text-lg font-bold text-gray-800 mb-2">
                  {detector.replace(/LLM/, "").replace(/Detector/, " Detector")}
                </h4>
                {severities.map((level) => (
                  <div key={level} className="mb-4">
                    {details[level]?.length > 0 && (
                      <>
                        <p className="text-sm font-semibold capitalize text-gray-700 mb-1">
                          {level} severity
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {details[level].map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open("/reports/scan_report.html", "_blank")}
        >
          <Download className="h-4 w-4 mr-2" /> View Full HTML Report
        </Button>
        <Button
          size="sm"
          onClick={() => window.open("/reports/scan_results.json", "_blank")}
        >
          <Download className="h-4 w-4 mr-2" /> Download JSON Summary
        </Button>
      </div>
    </div>
  );
}