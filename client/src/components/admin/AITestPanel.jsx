import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from './ui';
import { Brain, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getAIHealth } from '../../services/ai';
// Legacy aiModules kept for test cases that call individual AI functions
import { aiModules } from '../../services/ai';

export default function AITestPanel() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    runHealthCheck();
  }, []);

  const runHealthCheck = async () => {
    try {
      // getAIHealth() calls GET /api/ai/health on the backend — no browser-side Groq key needed.
      const health = await getAIHealth();
      setHealthStatus(health);
    } catch (error) {
      setHealthStatus({ status: 'error', error: error.message });
    }
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const tests = [
      {
        name: 'Health Check',
        test: () => aiModules.healthCheck(),
      },
      {
        name: 'Quick Insights (Deals)',
        test: () =>
          aiModules.generateQuickInsights({ deals: 10, revenue: 50000, conversion: 0.25 }, 'deals'),
      },
      {
        name: 'Deals Analysis',
        test: () =>
          aiModules.analyzeDeals({
            deals: [
              { name: 'Test Deal 1', value: 10000, stage: 'proposal' },
              { name: 'Test Deal 2', value: 25000, stage: 'negotiation' },
            ],
            pipelineStages: ['lead', 'proposal', 'negotiation', 'closed'],
            metrics: { totalDeals: 2, totalValue: 35000 },
          }),
      },
      {
        name: 'Generate Summary',
        test: () =>
          aiModules.generateSummary(
            'This is a test of the Groq AI integration for the Hermes admin panel. The AI should be able to summarize this content effectively.',
            50
          ),
      },
      {
        name: 'Generate Recommendations',
        test: () =>
          aiModules.generateRecommendations('Improve sales team performance', {
            context: 'sales',
            teamSize: 10,
            currentPerformance: 'average',
          }),
      },
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const endTime = Date.now();

        setTestResults((prev) => [
          ...prev,
          {
            name: test.name,
            status: 'success',
            duration: endTime - startTime,
            result: result,
          },
        ]);
      } catch (error) {
        setTestResults((prev) => [
          ...prev,
          {
            name: test.name,
            status: 'error',
            error: error.message,
          },
        ]);
      }
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Brain className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      case 'running':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Groq AI Integration Test Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Health Status */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(healthStatus?.status)}
              <div>
                <h4 className="font-semibold">AI Service Health</h4>
                <p className="text-sm text-gray-600">
                  {healthStatus?.status === 'healthy'
                    ? 'All systems operational'
                    : healthStatus?.status === 'unhealthy'
                      ? 'Service unavailable'
                      : 'Checking status...'}
                </p>
              </div>
            </div>
            <Badge className={getStatusColor(healthStatus?.status)}>
              {healthStatus?.status || 'checking'}
            </Badge>
          </div>

          {/* Test Controls */}
          <div className="flex items-center gap-4">
            <Button onClick={runTests} disabled={isRunning} className="flex items-center gap-2">
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              {isRunning ? 'Running Tests...' : 'Run AI Tests'}
            </Button>
            <Button variant="outline" onClick={runHealthCheck}>
              Check Health
            </Button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold">Test Results</h4>
              {testResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.duration && (
                        <span className="text-sm text-gray-500">{result.duration}ms</span>
                      )}
                      <Badge className={getStatusColor(result.status)}>{result.status}</Badge>
                    </div>
                  </div>

                  {result.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      Error: {result.error}
                    </div>
                  )}

                  {result.result && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                      <div className="font-medium text-green-700 mb-1">Response Preview:</div>
                      <pre className="text-xs text-gray-600 overflow-x-auto">
                        {JSON.stringify(result.result, null, 2).substring(0, 200)}...
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Setup Instructions */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Setup Instructions</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>
                Get your API key from{' '}
                <a
                  href="https://console.groq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  console.groq.com
                </a>
              </li>
              <li>
                Add{' '}
                <code className="bg-blue-100 px-1 rounded">VITE_GROQ_API_KEY=your_key_here</code> to
                your .env file
              </li>
              <li>Restart your development server</li>
              <li>Click "Run AI Tests" to verify integration</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
