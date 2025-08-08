import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Zap, TrendingUp, Target, Users, DollarSign, Clock, Star, RefreshCw, Sparkles, Key, Settings, AlertCircle, CheckCircle, Brain } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  targetMarket: string;
  problem: string;
  solution: string;
}

interface Evaluation {
  marketSize: number;
  competition: number;
  feasibility: number;
  profitability: number;
  innovation: number;
  timeToMarket: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  marketAnalysis: string;
  riskAssessment: string;
}

const categories = [
  'FinTech', 'HealthTech', 'EdTech', 'E-commerce', 'SaaS', 'AI/ML', 
  'Sustainability', 'Social Media', 'Gaming', 'Food & Beverage'
];

function App() {
  const [currentIdea, setCurrentIdea] = useState<Idea | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  const testApiConnection = async (testKey: string) => {
    try {
      const genAI = new GoogleGenerativeAI(testKey.trim());
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Simple test prompt
      const result = await model.generateContent("Say 'API connection successful'");
      const response = await result.response;
      const text = response.text();
      
      return { success: true, message: text };
    } catch (error: any) {
      console.error('API Test Error:', error);
      return { 
        success: false, 
        message: error.message || 'Unknown error',
        details: {
          name: error.name,
          status: error.status,
          statusText: error.statusText,
          stack: error.stack?.split('\n')[0]
        }
      };
    }
  };

  const generateAIIdea = async () => {
    if (!apiKey.trim()) {
      setShowApiKeyInput(true);
      return;
    }

    setIsGenerating(true);
    setError('');
    setDebugInfo('Starting API connection...');

    try {
      // First test the API connection
      setDebugInfo('Testing API connection...');
      const connectionTest = await testApiConnection(apiKey);
      
      if (!connectionTest.success) {
        setDebugInfo(`Connection failed: ${JSON.stringify(connectionTest.details, null, 2)}`);
        throw new Error(`API Connection Failed: ${connectionTest.message}`);
      }

      setDebugInfo('API connection successful, generating idea...');

      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      });

      const categoryPrompt = selectedCategory ? `in the ${selectedCategory} category` : 'in any innovative category';
      
      const prompt = `Generate a startup idea ${categoryPrompt}. Respond with valid JSON only:

{
  "title": "Startup name",
  "description": "Brief description",
  "category": "${selectedCategory || 'Innovation'}",
  "targetMarket": "Target market",
  "problem": "Problem solved",
  "solution": "Solution provided"
}`;

      setDebugInfo('Sending request to Gemini...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      setDebugInfo(`Received response: ${text.substring(0, 100)}...`);

      // Clean and parse JSON response
      let cleanedText = text.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      // Find JSON object in the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`No valid JSON found in response: ${cleanedText}`);
      }
      
      const ideaData = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      const requiredFields = ['title', 'description', 'category', 'targetMarket', 'problem', 'solution'];
      for (const field of requiredFields) {
        if (!ideaData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      const newIdea: Idea = {
        id: Date.now().toString(),
        title: ideaData.title,
        description: ideaData.description,
        category: ideaData.category,
        targetMarket: ideaData.targetMarket,
        problem: ideaData.problem,
        solution: ideaData.solution
      };

      setCurrentIdea(newIdea);
      setShowEvaluation(false);
      setEvaluation(null);
      setDebugInfo('Idea generated successfully!');
      
    } catch (err: any) {
      console.error('Full error details:', err);
      
      let errorMessage = 'Failed to generate idea. ';
      
      if (err.message?.includes('API_KEY_INVALID')) {
        errorMessage += 'Invalid API key. Please check your Gemini API key.';
      } else if (err.message?.includes('PERMISSION_DENIED')) {
        errorMessage += 'Permission denied. Please ensure your API key has the correct permissions.';
      } else if (err.message?.includes('QUOTA_EXCEEDED')) {
        errorMessage += 'API quota exceeded. Please check your usage limits.';
      } else if (err.message?.includes('Failed to fetch')) {
        errorMessage += 'Network error. Please check your internet connection.';
      } else if (err.message?.includes('API Connection Failed')) {
        errorMessage += err.message.replace('API Connection Failed: ', '');
      } else {
        errorMessage += `Error: ${err.message || 'Unknown error occurred'}`;
      }
      
      setError(errorMessage);
      setDebugInfo(`Error details: ${JSON.stringify({
        message: err.message,
        name: err.name,
        status: err.status,
        statusText: err.statusText
      }, null, 2)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const evaluateAIIdea = async () => {
    if (!currentIdea || !apiKey.trim()) {
      return;
    }

    setIsEvaluating(true);
    setError('');
    setDebugInfo('Starting AI evaluation...');

    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      const evaluationPrompt = `Evaluate this startup idea comprehensively. Respond with valid JSON only:

Startup Idea:
- Title: ${currentIdea.title}
- Description: ${currentIdea.description}
- Category: ${currentIdea.category}
- Target Market: ${currentIdea.targetMarket}
- Problem: ${currentIdea.problem}
- Solution: ${currentIdea.solution}

Provide a detailed evaluation in this exact JSON format:

{
  "marketSize": 4,
  "competition": 3,
  "feasibility": 5,
  "profitability": 4,
  "innovation": 5,
  "timeToMarket": 3,
  "overallScore": 85,
  "strengths": ["Unique value proposition", "Large addressable market", "Strong technical feasibility"],
  "weaknesses": ["High competition", "Long development time", "Regulatory challenges"],
  "recommendations": ["Focus on MVP development", "Conduct market research", "Build strategic partnerships"],
  "marketAnalysis": "Detailed analysis of the market opportunity, size, and trends",
  "riskAssessment": "Key risks and mitigation strategies"
}

Rate each criterion from 1-5 where:
- marketSize: 1=Very Small, 5=Huge Market
- competition: 1=No Competition, 5=Highly Competitive
- feasibility: 1=Very Difficult, 5=Highly Feasible
- profitability: 1=Low Profit, 5=High Profit Potential
- innovation: 1=Not Innovative, 5=Highly Innovative
- timeToMarket: 1=Very Long, 5=Very Quick

Calculate overallScore as percentage (0-100) based on weighted average of all criteria.`;

      setDebugInfo('Sending evaluation request to Gemini...');
      const result = await model.generateContent(evaluationPrompt);
      const response = await result.response;
      const text = response.text();
      
      setDebugInfo(`Received evaluation response: ${text.substring(0, 100)}...`);

      // Clean and parse JSON response
      let cleanedText = text.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      // Find JSON object in the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`No valid JSON found in evaluation response: ${cleanedText}`);
      }
      
      const evaluationData = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      const requiredFields = ['marketSize', 'competition', 'feasibility', 'profitability', 'innovation', 'timeToMarket', 'overallScore', 'strengths', 'weaknesses', 'recommendations', 'marketAnalysis', 'riskAssessment'];
      for (const field of requiredFields) {
        if (evaluationData[field] === undefined || evaluationData[field] === null) {
          throw new Error(`Missing required evaluation field: ${field}`);
        }
      }

      const newEvaluation: Evaluation = {
        marketSize: evaluationData.marketSize,
        competition: evaluationData.competition,
        feasibility: evaluationData.feasibility,
        profitability: evaluationData.profitability,
        innovation: evaluationData.innovation,
        timeToMarket: evaluationData.timeToMarket,
        overallScore: evaluationData.overallScore,
        strengths: evaluationData.strengths,
        weaknesses: evaluationData.weaknesses,
        recommendations: evaluationData.recommendations,
        marketAnalysis: evaluationData.marketAnalysis,
        riskAssessment: evaluationData.riskAssessment
      };

      setEvaluation(newEvaluation);
      setShowEvaluation(true);
      setDebugInfo('AI evaluation completed successfully!');
      
    } catch (err: any) {
      console.error('Evaluation error details:', err);
      
      let errorMessage = 'Failed to evaluate idea. ';
      
      if (err.message?.includes('API_KEY_INVALID')) {
        errorMessage += 'Invalid API key. Please check your Gemini API key.';
      } else if (err.message?.includes('PERMISSION_DENIED')) {
        errorMessage += 'Permission denied. Please ensure your API key has the correct permissions.';
      } else if (err.message?.includes('QUOTA_EXCEEDED')) {
        errorMessage += 'API quota exceeded. Please check your usage limits.';
      } else if (err.message?.includes('Failed to fetch')) {
        errorMessage += 'Network error. Please check your internet connection.';
      } else {
        errorMessage += `Error: ${err.message || 'Unknown error occurred'}`;
      }
      
      setError(errorMessage);
      setDebugInfo(`Evaluation error details: ${JSON.stringify({
        message: err.message,
        name: err.name,
        status: err.status,
        statusText: err.statusText
      }, null, 2)}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const saveApiKey = () => {
    if (tempApiKey.trim()) {
      setApiKey(tempApiKey.trim());
      localStorage.setItem('gemini-api-key', tempApiKey.trim());
      setShowApiKeyInput(false);
      setError('');
      setDebugInfo('');
    }
  };

  const clearApiKey = () => {
    setApiKey('');
    setTempApiKey('');
    localStorage.removeItem('gemini-api-key');
    setError('');
    setDebugInfo('');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  const getCriteriaColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="mr-4"
            >
              <Sparkles className="w-12 h-12 text-accent-500" />
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-bold gradient-text">
              Startup Idea Lab
            </h1>
          </div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Generate innovative startup ideas with AI and get comprehensive evaluations powered by advanced AI analysis
          </p>
          
          {/* API Key Status */}
          <div className="flex items-center justify-center mt-6 space-x-4">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
              apiKey ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {apiKey ? <CheckCircle className="w-4 h-4" /> : <Key className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {apiKey ? 'Gemini AI Connected' : 'API Key Required'}
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setTempApiKey(apiKey);
                setShowApiKeyInput(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 text-sm font-medium transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Configure</span>
            </motion.button>
          </div>
        </motion.div>

        {/* API Key Modal */}
        <AnimatePresence>
          {showApiKeyInput && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
              >
                <div className="flex items-center mb-6">
                  <Key className="w-8 h-8 text-primary-500 mr-3" />
                  <h3 className="text-2xl font-bold text-slate-800">Connect Gemini AI</h3>
                </div>
                
                <p className="text-slate-600 mb-6">
                  Enter your Google Gemini API key to generate AI-powered startup ideas and evaluations. 
                  <a 
                    href="https://makersuite.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-500 hover:text-primary-600 underline ml-1"
                  >
                    Get your API key here
                  </a>
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      placeholder="Enter your Gemini API key (starts with AIza...)"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                    {tempApiKey && !tempApiKey.startsWith('AIza') && (
                      <p className="text-red-500 text-sm mt-1">
                        API key should start with "AIza"
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={saveApiKey}
                      disabled={!tempApiKey.trim()}
                      className="flex-1 bg-primary-500 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save & Connect
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowApiKeyInput(false)}
                      className="flex-1 bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-lg"
                    >
                      Cancel
                    </motion.button>
                  </div>
                  
                  {apiKey && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={clearApiKey}
                      className="w-full bg-red-100 text-red-700 font-semibold py-2 px-4 rounded-lg text-sm"
                    >
                      Clear Saved API Key
                    </motion.button>
                  )}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Privacy:</strong> Your API key is stored locally in your browser and never sent to our servers.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Debug Info */}
        {debugInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <h4 className="font-semibold text-blue-800 mb-2">Debug Information:</h4>
            <pre className="text-sm text-blue-700 whitespace-pre-wrap">{debugInfo}</pre>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Idea Generator */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-2xl p-8"
          >
            <div className="flex items-center mb-6">
              <Lightbulb className="w-8 h-8 text-primary-500 mr-3" />
              <h2 className="text-2xl font-bold text-slate-800">AI Idea Generator</h2>
            </div>

            {/* Category Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Category (Optional)
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">Any Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generateAIIdea}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold py-4 px-6 rounded-xl mb-8 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCw className="w-5 h-5" />
                  </motion.div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate AI Idea</span>
                </>
              )}
            </motion.button>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2"
              >
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-red-700 text-sm">
                  <p className="font-medium mb-1">Error Details:</p>
                  <p>{error}</p>
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {currentIdea && (
                <motion.div
                  key={currentIdea.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                      {currentIdea.category}
                    </span>
                    <span className="bg-accent-100 text-accent-700 px-3 py-1 rounded-full text-sm font-medium">
                      AI Generated
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-3">
                      {currentIdea.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {currentIdea.description}
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Target className="w-5 h-5 text-primary-500 mr-2" />
                        <h4 className="font-semibold text-slate-700">Target Market</h4>
                      </div>
                      <p className="text-slate-600">{currentIdea.targetMarket}</p>
                    </div>

                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Zap className="w-5 h-5 text-red-500 mr-2" />
                        <h4 className="font-semibold text-slate-700">Problem</h4>
                      </div>
                      <p className="text-slate-600">{currentIdea.problem}</p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Star className="w-5 h-5 text-green-500 mr-2" />
                        <h4 className="font-semibold text-slate-700">Solution</h4>
                      </div>
                      <p className="text-slate-600">{currentIdea.solution}</p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={evaluateAIIdea}
                    disabled={isEvaluating}
                    className="w-full bg-gradient-to-r from-accent-500 to-primary-500 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEvaluating ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <RefreshCw className="w-5 h-5" />
                        </motion.div>
                        <span>AI Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="w-5 h-5" />
                        <span>Get AI Evaluation</span>
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {!currentIdea && !isGenerating && (
              <div className="text-center py-12">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-4"
                >
                  <Lightbulb className="w-16 h-16 text-slate-300 mx-auto" />
                </motion.div>
                <p className="text-slate-500">
                  {apiKey 
                    ? "Click the button above to generate your first AI-powered startup idea!"
                    : "Connect your Gemini API key to start generating innovative startup ideas"
                  }
                </p>
              </div>
            )}
          </motion.div>

          {/* AI Evaluator */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-2xl p-8"
          >
            <div className="flex items-center mb-6">
              <Brain className="w-8 h-8 text-accent-500 mr-3" />
              <h2 className="text-2xl font-bold text-slate-800">AI Evaluator</h2>
            </div>

            {showEvaluation && evaluation ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Overall Score */}
                <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-6 text-center">
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">AI Overall Score</h3>
                  <div className={`text-4xl font-bold ${getScoreColor(evaluation.overallScore)} mb-2`}>
                    {evaluation.overallScore}%
                  </div>
                  <div className={`text-lg font-medium ${getScoreColor(evaluation.overallScore)}`}>
                    {getScoreLabel(evaluation.overallScore)}
                  </div>
                  
                  {/* Score Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-3 mt-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${evaluation.overallScore}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="bg-gradient-to-r from-primary-500 to-accent-500 h-3 rounded-full"
                    />
                  </div>
                </div>

                {/* Evaluation Criteria */}
                <div className="space-y-4">
                  {[
                    { key: 'marketSize', label: 'Market Size', icon: Users, color: 'text-blue-500' },
                    { key: 'competition', label: 'Competition Level', icon: Target, color: 'text-red-500' },
                    { key: 'feasibility', label: 'Technical Feasibility', icon: Zap, color: 'text-yellow-500' },
                    { key: 'profitability', label: 'Profit Potential', icon: DollarSign, color: 'text-green-500' },
                    { key: 'innovation', label: 'Innovation Factor', icon: Star, color: 'text-purple-500' },
                    { key: 'timeToMarket', label: 'Time to Market', icon: Clock, color: 'text-indigo-500' }
                  ].map(({ key, label, icon: Icon, color }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center">
                        <Icon className={`w-5 h-5 ${color} mr-3`} />
                        <span className="font-medium text-slate-700">{label}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg font-bold ${getCriteriaColor(evaluation[key as keyof Evaluation] as number)}`}>
                          {evaluation[key as keyof Evaluation]}/5
                        </span>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <div
                              key={rating}
                              className={`w-3 h-3 rounded-full ${
                                (evaluation[key as keyof Evaluation] as number) >= rating
                                  ? 'bg-primary-500'
                                  : 'bg-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Strengths */}
                <div className="bg-green-50 rounded-xl p-6">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {evaluation.strengths.map((strength, index) => (
                      <li key={index} className="text-green-700 flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="bg-red-50 rounded-xl p-6">
                  <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Weaknesses
                  </h4>
                  <ul className="space-y-2">
                    {evaluation.weaknesses.map((weakness, index) => (
                      <li key={index} className="text-red-700 flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Market Analysis */}
                <div className="bg-blue-50 rounded-xl p-6">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Market Analysis
                  </h4>
                  <p className="text-blue-700 leading-relaxed">{evaluation.marketAnalysis}</p>
                </div>

                {/* Risk Assessment */}
                <div className="bg-yellow-50 rounded-xl p-6">
                  <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Risk Assessment
                  </h4>
                  <p className="text-yellow-700 leading-relaxed">{evaluation.riskAssessment}</p>
                </div>

                {/* Recommendations */}
                <div className="bg-purple-50 rounded-xl p-6">
                  <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2" />
                    AI Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {evaluation.recommendations.map((recommendation, index) => (
                      <li key={index} className="text-purple-700 flex items-start">
                        <span className="text-purple-500 mr-2">•</span>
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-4"
                >
                  <Brain className="w-16 h-16 text-slate-300 mx-auto" />
                </motion.div>
                <p className="text-slate-500">
                  {currentIdea 
                    ? "Click 'Get AI Evaluation' to receive comprehensive AI-powered analysis"
                    : "Generate an AI-powered idea first to begin evaluation"
                  }
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 text-slate-500"
        >
          <p>Built for entrepreneurs who dare to dream big 🚀</p>
        </motion.div>
      </div>
    </div>
  );
}

export default App;
