// bias-metrics.tsx

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts"
import {
  Download,
  FileText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  Target,
} from "lucide-react"

// --- Import the type definitions we created previously ---
interface DashboardMetrics {
  overall_fairness: {
    percentage: number;
    status_text: string;
  };
  critical_issues: {
    count: number;
    status_text: string;
  };
  groups_analyzed: {
    count: number;
    status_text: string;
  };
  confidence_level: {
    percentage: number;
    status_text: string;
  };
}

interface FailingExample {
  question: string;
  protected_attribute: string;
  protected_value: string;
  agent_response: string;
  reason: string;
}

interface IssueSummary {
  name: string;
  severity: string;
  description: string;
  status: string;
  failing_examples?: FailingExample[];
  test_results_count: number;
}

interface DetailedAnalysis {
  test_type: string;
  overall_status: string;
  issues: IssueSummary[];
  scan_info: string;
  prompt_details: Array<{
    question: string;
    gender: string; // Assuming 'gender' is the protected attribute in prompt_details
    agent_response: string;
  }>;
}

interface BiasAnalysisResultData { // This is the 'result' object from your backend's BiasAnalysisResponse
  dashboard_metrics: DashboardMetrics;
  detailed_analysis: DetailedAnalysis;
}
// --- END Type Definitions ---


// Mock data for charts not dynamically populated by current Giskard output (e.g., race, intersectional)
const mockEqualOpportunityData = [
  { name: "White", value: 0.85, benchmark: 0.8, count: 520 },
  { name: "Black", value: 0.72, benchmark: 0.8, count: 180 },
  { name: "Asian", value: 0.79, benchmark: 0.8, count: 120 },
  { name: "Hispanic", value: 0.74, benchmark: 0.7, count: 95 },
  { name: "Other", value: 0.76, benchmark: 0.8, count: 85 },
];

const mockIntersectionalData = [
  { name: "White Male", value: 0.86, fill: "#3B82F6" },
  { name: "White Female", value: 0.82, fill: "#10B981" },
  { name: "Black Male", value: 0.75, fill: "#F59E0B" },
  { name: "Black Female", value: 0.69, fill: "#EF4444" },
  { name: "Asian Male", value: 0.81, fill: "#8B5CF6" },
  { name: "Asian Female", value: 0.77, fill: "#EC4899" },
];


// --- NEW PROPS FOR BiasMetrics COMPONENT ---
interface BiasMetricsProps {
  data: BiasAnalysisResultData | null; // The JSON result from the backend
  isLoading: boolean; // Loading state from the parent (page.tsx)
  onRefresh: () => void; // Function to re-trigger analysis passed from parent
  onDownloadReport: () => void; // Function to download report passed from parent
}
// --- END NEW PROPS ---


export function BiasMetrics({ data, isLoading, onRefresh, onDownloadReport }: BiasMetricsProps) {
  // Initialize state with a complete, safe default structure
  const defaultDashboardMetrics: DashboardMetrics = {
    overall_fairness: { percentage: 0, status_text: 'N/A' },
    critical_issues: { count: 0, status_text: 'N/A' },
    groups_analyzed: { count: 0, status_text: 'N/A' },
    confidence_level: { percentage: 0, status_text: 'N/A' },
  };

  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultDashboardMetrics);
  const [demographicParityChartData, setDemographicParityChartData] = useState<any[]>([]);
  const [demographicParityFinding, setDemographicParityFinding] = useState<string>('');
  const [overallScoreGaugeData, setOverallScoreGaugeData] = useState([{ name: "Fairness Score", value: 0, fill: "#F59E0B" }]);
  const [detailedIssues, setDetailedIssues] = useState<IssueSummary[]>([]);
  const [allPromptsDetails, setAllPromptsDetails] = useState<any[]>([]);


  useEffect(() => {
    console.log("BiasMetrics: useEffect triggered. Data:", data, "isLoading:", isLoading);
    
    if (data) {
      console.log("BiasMetrics: Data received, populating metrics and charts.");
      // --- Populate Main Dashboard Metrics ---
      // Use provided data, but fall back to defaults if any part is missing unexpectedly
      setMetrics(data.dashboard_metrics || defaultDashboardMetrics);

      // --- Populate Detailed Analysis (Issues and all prompts) ---
      setDetailedIssues(data.detailed_analysis?.issues || []); // Safely access and default to empty array
      setAllPromptsDetails(data.detailed_analysis?.prompt_details || []); // Safely access and default to empty array

      // --- Derive data for Demographic Parity Chart ---
      const prompts = data.detailed_analysis?.prompt_details || []; 
      
      const customStereotypesIssue = (data.detailed_analysis?.issues || []).find(
        issue => issue.name === "Custom_StereotypesDetector_PromptYAML"
      );
      const failingExamples = customStereotypesIssue?.failing_examples || [];
      const protectedAttr = "gender"; 

      const groups: { [key: string]: { total: number; failing: number } } = {};
      const uniqueProtectedValues = new Set<string>();

      prompts.forEach(p => {
        const groupValue = (p as any)[protectedAttr]; 
        if (groupValue) { 
          uniqueProtectedValues.add(groupValue);
          if (!groups[groupValue]) {
            groups[groupValue] = { total: 0, failing: 0 };
          }
          groups[groupValue].total += 1;
        }
      });

      failingExamples.forEach(fe => {
          const groupValue = (fe as any)[protectedAttr]; 
          if (groups[groupValue]) { 
              groups[groupValue].failing += 1;
          }
      });

      const derivedChartData = Array.from(uniqueProtectedValues).map(groupName => {
        const total = groups[groupName]?.total || 0;
        const failing = groups[groupName]?.failing || 0;
        const passRate = total > 0 ? (total - failing) / total : 0;
        
        return {
          name: groupName.charAt(0).toUpperCase() + groupName.slice(1), 
          value: passRate, 
          benchmark: 0.85, 
          count: total,
        };
      });
      setDemographicParityChartData(derivedChartData);

      // Set critical finding message for Demographic Parity
      if (failingExamples.length > 0) {
        setDemographicParityFinding(failingExamples[0].reason); 
      } else {
        setDemographicParityFinding('No specific critical finding for demographic parity detected by this analysis.');
      }

      // Update Overall Score Gauge
      setOverallScoreGaugeData([{ name: "Fairness Score", value: data.dashboard_metrics?.overall_fairness?.percentage || 0, fill: "#F59E0B" }]);

    } else if (!isLoading && !data) {
      // If not loading and no data, it means analysis hasn't run or failed
      console.log("BiasMetrics: No data or analysis failed. Resetting display.");
      // Reset to default states to reflect no data
      setMetrics(defaultDashboardMetrics); // Reset to default full object
      setDemographicParityChartData([]);
      setDemographicParityFinding("");
      setOverallScoreGaugeData([{ name: "Fairness Score", value: 0, fill: "#F59E0B" }]);
      setDetailedIssues([]);
      setAllPromptsDetails([]);
    }
  }, [data, isLoading]); 


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {(entry.value * 100).toFixed(1)}%
              {entry.payload.count !== undefined && ` (Tested ${entry.payload.count} prompts)`} 
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Display loading/error state for the whole component
  if (isLoading || !data) { 
    console.log("BiasMetrics: Rendering loading/waiting state. isLoading:", isLoading, "data is null:", !data);
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">{isLoading ? "Running bias analysis..." : "Waiting for analysis data..."}</p>
        {!isLoading && !data && <p className="text-red-500 mt-2">Analysis data not available. Please run the analysis.</p>}
      </div>
    );
  }


  return (
    <div className="space-y-8">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Comprehensive Bias Analysis</h3>
          <p className="text-gray-600">Detailed fairness metrics and insights from your dataset analysis</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh} 
            disabled={isLoading}
            className="border-gray-300 hover:bg-gray-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Analysis
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={onDownloadReport} 
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview (Populated by metrics state) */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Overall Fairness</p>
                <p className="text-3xl font-bold text-blue-800">{metrics.overall_fairness.percentage}%</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  {metrics.overall_fairness.status_text === "Needs improvement" && <TrendingDown className="h-3 w-3 mr-1" />}
                  {metrics.overall_fairness.status_text === "No Issues Detected" && <TrendingUp className="h-3 w-3 mr-1" />}
                  {metrics.overall_fairness.status_text}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-red-50 to-pink-50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Critical Issues</p>
                <p className="text-3xl font-bold text-red-800">{metrics.critical_issues.count}</p>
                <p className="text-xs text-red-600 flex items-center mt-1">
                  {metrics.critical_issues.count > 0 && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {metrics.critical_issues.status_text}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Groups Analyzed</p>
                <p className="text-3xl font-bold text-emerald-800">{metrics.groups_analyzed.count}</p>
                <p className="text-xs text-emerald-600 flex items-center mt-1">
                  <Users className="h-3 w-3 mr-1" />
                  {metrics.groups_analyzed.status_text}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-violet-50 to-purple-50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-violet-700">Confidence Level</p>
                <p className="text-3xl font-bold text-violet-800">{metrics.confidence_level.percentage}%</p>
                <p className="text-xs text-violet-600 flex items-center mt-1">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {metrics.confidence_level.status_text}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="group" className="space-y-6">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 h-12 bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg rounded-xl p-1">
            <TabsTrigger
              value="group"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              Group Fairness
            </TabsTrigger>
            <TabsTrigger
              value="individual"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              Individual
            </TabsTrigger>
            <TabsTrigger
              value="intersectional"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              Intersectional
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              Summary
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="group" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Demographic Parity Chart (Populated by derived data) */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-bold text-gray-800">Fairness Pass Rate by Gender</h4>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${demographicParityFinding ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {demographicParityFinding ? "Needs Attention" : "Good"}
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demographicParityChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDashArray="3 3" stroke="#e0e7ff" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis domain={[0, 1]} stroke="#6b7280" label={{ value: "Fairness Pass Rate", angle: -90, position: "insideLeft" }}/>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="value" fill="url(#blueGradient)" name="Fairness Pass Rate" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="benchmark" fill="url(#greenGradient)" name="Benchmark" radius={[4, 4, 0, 0]} />
                      <defs>
                        <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#1E40AF" />
                        </linearGradient>
                        <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#047857" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {demographicParityFinding && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-800 mb-1">Critical Finding</p>
                    <p className="text-sm text-red-700">
                      {demographicParityFinding}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Equal Opportunity Chart (Uses Mock Data) */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-bold text-gray-800">Equal Opportunity by Race (Illustrative)</h4>
                  <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                    Moderate
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockEqualOpportunityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDashArray="3 3" stroke="#d1fae5" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis domain={[0, 1]} stroke="#6b7280" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="value"
                        fill="url(#emeraldGradient)"
                        name="True Positive Rate"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar dataKey="benchmark" fill="url(#tealGradient)" name="Benchmark" radius={[4, 4, 0, 0]} />
                      <defs>
                        <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#047857" />
                        </linearGradient>
                        <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#14B8A6" />
                          <stop offset="100%" stopColor="#0F766E" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">Moderate Concern (Illustrative)</p>
                  <p className="text-sm text-yellow-700">
                    This section provides illustrative data for Equal Opportunity by Race.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fairness Score Gauge */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-violet-50 to-purple-50">
            <CardContent className="p-6">
              <h4 className="text-lg font-bold text-gray-800 mb-6">Overall Group Fairness Score</h4>
              <div className="flex items-center justify-center">
                <div className="h-[200px] w-full max-w-md">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={overallScoreGaugeData}>
                      <RadialBar dataKey="value" cornerRadius={10} fill="url(#scoreGradient)" />
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#D97706" />
                        </linearGradient>
                      </defs>
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="text-center">
                {/* Safe access using Optional Chaining here */}
                <p className="text-4xl font-bold text-amber-600 mb-2">{metrics.overall_fairness?.percentage || 0}%</p>
                <p className="text-gray-600">{metrics.overall_fairness?.status_text} to meet fairness standards</p>
              </div>
            </CardContent>
          </Card>

          {/* Displaying Critical Issues and Failing Examples */}
          {detailedIssues.length > 0 ? (
            <div className="space-y-4">
              <h4 className="text-xl font-bold text-gray-800">Detected Group Fairness Issues</h4>
              {detailedIssues.map((issue, index) => (
                <Card key={index} className={`border-2 ${issue.severity === 'MAJOR' ? 'border-red-400' : 'border-gray-200'} shadow-lg bg-white/90 backdrop-blur-sm`}>
                  <CardContent className="p-6">
                    <h5 className="text-lg font-bold text-gray-800 flex items-center">
                      {issue.name} - <span className={`ml-2 text-sm px-2 py-1 rounded-full ${issue.severity === 'MAJOR' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{issue.severity}</span>
                    </h5>
                    <p className="text-gray-600 mt-2">{issue.description}</p>
                    {issue.failing_examples && issue.failing_examples.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h6 className="font-semibold text-gray-800 mb-2">Failing Examples ({issue.failing_examples.length})</h6>
                        {issue.failing_examples.map((example, exIndex) => (
                          <div key={exIndex} className="mb-4 p-4 border rounded-lg bg-red-50 border-red-200">
                            <p className="font-medium text-gray-800">**Question:** {example.question}</p>
                            <p className="font-medium text-gray-800">**Protected Attribute:** {example.protected_attribute} = {example.protected_value}</p>
                            <p className="text-gray-700">**Agent Response:** <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-2 rounded">{example.agent_response}</pre></p>
                            <p className="text-red-700 mt-2">**Reason:** {example.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No specific issues detected by the custom group fairness analysis.</p>
          )}
          
          {/* Display All Prompts Details (useful for debugging/full view) */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <h4 className="text-xl font-bold text-gray-800">All Custom Prompts and Responses</h4>
            <div className="space-y-4 mt-4">
              {allPromptsDetails.map((promptDetail, pIndex) => (
                <Card key={pIndex} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-4 text-gray-700">
                    <p className="font-medium">**Question:** {promptDetail.question}</p>
                    <p className="font-medium">**Gender:** {promptDetail.gender}</p>
                    <p>**Agent Response:** <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-2 rounded">{promptDetail.agent_response}</pre></p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

        </TabsContent>

        {/* Individual Tab (Uses Mock Data) */}
        <TabsContent value="individual" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardContent className="p-6">
                <h4 className="text-lg font-bold text-gray-800 mb-6">Individual Consistency Analysis (Illustrative)</h4>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { distance: 0.1, consistency: 0.95 },
                        { distance: 0.2, consistency: 0.92 },
                        { distance: 0.3, consistency: 0.87 },
                        { distance: 0.4, consistency: 0.82 },
                        { distance: 0.5, consistency: 0.76 },
                        { distance: 0.6, consistency: 0.68 },
                        { distance: 0.7, consistency: 0.61 },
                        { distance: 0.8, consistency: 0.55 },
                        { distance: 0.9, consistency: 0.48 },
                        { distance: 1.0, consistency: 0.42 },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDashArray="3 3" stroke="#d1fae5" />
                      <XAxis
                        dataKey="distance"
                        label={{ value: "Individual Distance", position: "insideBottom", offset: -10 }}
                        stroke="#6b7280"
                      />
                      <YAxis
                        domain={[0, 1]}
                        label={{ value: "Consistency Score", angle: -90, position: "insideLeft" }}
                        stroke="#6b7280"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="consistency"
                        stroke="url(#consistencyGradient)"
                        strokeWidth={3}
                        dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                      />
                      <defs>
                        <linearGradient id="consistencyGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#14B8A6" />
                        </linearGradient>
                      </defs>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm font-semibold text-emerald-800 mb-1">Good Performance (Illustrative)</p>
                  <p className="text-sm text-emerald-700">
                    This section provides illustrative data for Individual Consistency Analysis.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <h4 className="text-lg font-bold text-gray-800 mb-6">Counterfactual Fairness (Illustrative)</h4>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Fair", value: 78, fill: "#10B981" },
                          { name: "Unfair", value: 22, fill: "#EF4444" },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: "Fair", value: 78, fill: "#10B981" },
                          { name: "Unfair", value: 22, fill: "#EF4444" },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">Moderate Concern (Illustrative)</p>
                  <p className="text-sm text-yellow-700">
                    This section provides illustrative data for Counterfactual Fairness.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Intersectional Tab (Uses Mock Data) */}
        <TabsContent value="intersectional" className="space-y-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6">
              <h4 className="text-lg font-bold text-gray-800 mb-6">Intersectional Bias Analysis (Illustrative)</h4>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-md font-semibold text-gray-700 mb-4">Selection Rate by Gender × Race</h5>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mockIntersectionalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDashArray="3 3" stroke="#fed7aa" />
                        <XAxis dataKey="name" stroke="#6b7280" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[0, 1]} stroke="#6b7280" />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h5 className="text-md font-semibold text-gray-700 mb-4">Disparity Analysis</h5>
                  <div className="space-y-3">
                    {mockIntersectionalData.map((group, index) => {
                      const disparityRatio = group.value / 0.86 // Using White Male as reference
                      const status = disparityRatio >= 0.9 ? "Fair" : disparityRatio >= 0.8 ? "Moderate" : "Unfair"
                      const statusColor =
                        status === "Fair"
                          ? "bg-green-100 text-green-700"
                          : status === "Moderate"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: group.fill }}></div>
                            <span className="text-sm font-medium text-gray-800">{group.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">{(group.value * 100).toFixed(1)}%</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                              {status}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-semibold text-red-800">Critical Intersectional Bias Detected (Illustrative)</h5>
                    <p className="text-sm text-red-700 mt-1">
                      This section provides illustrative data for Intersectional Bias Analysis.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-50 to-gray-100">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl mb-4 shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-gray-800 mb-2">Executive Summary (Illustrative)</h4>
                <p className="text-gray-600">Comprehensive fairness analysis results and recommendations</p>
              </div>

              {/* Key Findings */}
              <div className="grid gap-6 lg:grid-cols-3 mb-8">
                <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl font-bold text-amber-600 mb-2">76%</div>
                    <p className="text-sm font-medium text-amber-700">Overall Fairness Score</p>
                    <p className="text-xs text-amber-600 mt-1">Moderate concerns identified</p>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-red-50 to-pink-50 shadow-lg">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl font-bold text-red-600 mb-2">Black Females</div>
                    <p className="text-sm font-medium text-red-700">Most Affected Group</p>
                    <p className="text-xs text-red-600 mt-1">20% lower selection rate</p>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-purple-50 to-violet-50 shadow-lg">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl font-bold text-purple-600 mb-2">Intersectional</div>
                    <p className="text-sm font-medium text-purple-700">Primary Bias Type</p>
                    <p className="text-xs text-purple-600 mt-1">Race × Gender interaction</p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Findings */}
              <div className="space-y-6">
                <div>
                  <h5 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <TrendingDown className="h-5 w-5 mr-2 text-red-500" />
                    Critical Findings (Illustrative)
                  </h5>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h6 className="font-semibold text-red-800 mb-2">Group Fairness Issues</h6>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• Non-binary individuals: 13% below benchmark</li>
                        <li>• Black individuals: 10% lower true positive rate</li>
                        <li>• Age groups 18-25 and 56+: Reduced precision</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <h6 className="font-semibold text-orange-800 mb-2">Intersectional Bias</h6>
                      <ul className="text-sm text-orange-700 space-y-1">
                        <li>• Black females: 20% disparity ratio</li>
                        <li>• Compounding discrimination effects</li>
                        <li>• Multiple protected attributes interaction</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-emerald-500" />
                    Recommendations (Illustrative)
                  </h5>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h6 className="font-semibold text-blue-800 mb-2">Immediate Actions</h6>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Implement fairness constraints in model training</li>
                        <li>• Apply post-processing bias correction</li>
                        <li>• Increase representation of underrepresented groups</li>
                        <li>• Increase representation of underrepresented groups</li>
                        <li>• Apply post-processing bias correction</li>
                        <li>• Increase representation of underrepresented groups</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <h6 className="font-semibold text-emerald-800 mb-2">Long-term Strategy</h6>
                      <ul className="text-sm text-emerald-700 space-y-1">
                        <li>• Establish continuous bias monitoring</li>
                        <li>• Develop intersectional fairness metrics</li>
                        <li>• Create diverse evaluation datasets</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-center mt-8 pt-6 border-t border-gray-200">
                <Button
                  onClick={onDownloadReport}
                  size="lg"
                  className="bg-gradient-to-r from-violet-500 to-purple-500 px-8 py-3 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Download Complete Analysis Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}