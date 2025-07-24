"use client"

import type React from "react"
import { useState } from "react"
import { Upload, FileText, Loader2, AlertCircle, Bot, MessageSquare, Download, Volume2, VolumeX, Mic, Trash2, Eye, BarChart3, Send, Play, Pause, Settings, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AnalysisResponse {
  summary: string
  key_points?: string[]
  word_count?: number
  page_count?: number
  images?: string[];
}

export default function PDFAnalyzer() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [qaLoading, setQaLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<{ question: string; answer: string }[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile)
      setError(null)
      setAnalysis(null)
    } else {
      setError("Please select a valid PDF file.")
      setFile(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF file first.")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("http://localhost:8000/analyze-pdf/", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const result = await response.json()
      setAnalysis(result)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while analyzing the PDF."
      setError(message)
    } finally {
      setIsUploading(false)
    }
  }

  const resetUpload = () => {
    setFile(null)
    setAnalysis(null)
    setError(null)
    setChatHistory([])
    const fileInput = document.getElementById("pdf-upload") as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  const askQuestion = async () => {
    if (!question) return

    const newChat = { question, answer: "" }
    setChatHistory(prev => [...prev, newChat])

    setQaLoading(true)
    setAnswer("")
    setError(null)

    try {
      const res = await fetch("http://localhost:8000/ask-question/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      })

      const data = await res.json()

      if (data.answer) {
        setAnswer(data.answer)
        setChatHistory(prev =>
          prev.map((chat, i) =>
            i === prev.length - 1 ? { ...chat, answer: data.answer } : chat
          )
        )
        
        // Only play audio if enabled
        if (audioEnabled) {
          await playAnswerAudio(data.answer)
        }
      } else {
        setError("No answer returned.")
      }
    } catch (err) {
      setError("Error fetching answer. Try again later.")
    } finally {
      setQaLoading(false)
      setQuestion("")
    }
  }

  const clearChat = async () => {
    await fetch("http://localhost:8000/clear-chat/", { method: "POST" })
    setChatHistory([])
  }

  const playAnswerAudio = async (text: string) => {
    try {
      const res = await fetch("http://localhost:8000/narrate-answer/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: text }),
      })

      if (!res.ok) {
        console.error("Failed to generate audio for the answer.")
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      const audio = new Audio(url)
      audio.play()
    } catch (error) {
      console.error("Error playing audio:", error)
    }
  }

  const handlePlayAudio = async () => {
    if (!analysis || !analysis.summary) {
      setError("No summary available to narrate.")
      return
    }

    setIsPlayingAudio(true)
    const res = await fetch("http://localhost:8000/narrate-summary/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ summary: analysis.summary }),
    })

    if (!res.ok) {
      setError("Failed to generate audio.")
      setIsPlayingAudio(false)
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)

    const audioPlayer = document.getElementById("audioPlayer") as HTMLAudioElement
    if (audioPlayer) {
      audioPlayer.src = url
      audioPlayer.onended = () => setIsPlayingAudio(false)
      audioPlayer.play()
    }
  }

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Your browser doesn't support speech recognition")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    setIsListening(true)

    recognition.onstart = () => {
      console.log("🎙️ Listening...")
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setQuestion(transcript)
      console.log("🎤 You said:", transcript)
    }

    recognition.onerror = (event: any) => {
      console.warn("⚠️ Speech recognition error:", event.error)
      setIsListening(false)
      if (event.error === "no-speech") {
        alert("Didn't catch that. Try speaking louder or clearer.")
      } else if (event.error === "aborted") {
        alert("Speech was interrupted. Please try again.")
      } else {
        alert(`Error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      console.log("🛑 Speech recognition ended")
      setIsListening(false)
    }

    recognition.start()
  }

  const downloadSummary = async () => {
    if (!analysis?.summary) return

    const response = await fetch("http://localhost:8000/download-summary/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ summary: analysis.summary }),
    })

    if (!response.ok) {
      alert("Something went wrong while generating the PDF.")
      return
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "summary.pdf"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Premium Header */}
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                  Bizbot
                </h1>
                <p className="text-sm text-blue-200/80 font-medium">AI-Powered Document Intelligence</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-white">Premium AI</span>
              </div>
              <div className="flex items-center space-x-2 text-blue-200">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                <span className="text-sm font-medium">Business Intelligence</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8 min-h-[calc(100vh-200px)]">
          
          {/* Left Column - Thinner Upload & Settings (30%) */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            
            {/* PDF Upload Card */}
            <Card className="shadow-2xl border-0 bg-white/5 backdrop-blur-xl border border-white/10">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-xl border-b border-white/5">
                <CardTitle className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Upload className="h-5 w-5 text-blue-400" />
                  </div>
                  Document Upload
                </CardTitle>
                <CardDescription className="text-blue-200/70">
                  Upload PDF files for intelligent analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Drag & Drop Zone */}
                  <div className="relative">
                    <label
                      htmlFor="pdf-upload"
                      className="group flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-blue-400/30 rounded-xl cursor-pointer bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-400/50 transition-all duration-300"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div className="p-3 bg-blue-500/10 rounded-full mb-4 group-hover:bg-blue-500/20 transition-colors">
                          <FileText className="w-8 h-8 text-blue-400" />
                        </div>
                        <p className="mb-2 text-sm text-white font-medium">
                          Drop your PDF here
                        </p>
                        <p className="text-xs text-blue-200/60 mb-3">or click to browse files</p>
                        <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-lg font-medium">
                          Choose File
                        </div>
                      </div>
                      <input id="pdf-upload" type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>

                  {/* File Preview */}
                  {file && (
                    <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-400/20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <FileText className="h-4 w-4 text-green-400" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-white block truncate max-w-[150px]">{file.name}</span>
                            <span className="text-xs text-green-200">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={resetUpload} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="w-full bg-green-500/20 rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full w-full animate-pulse"></div>
                      </div>
                    </div>
                  )}

                  {/* Error Alert */}
                  {error && (
                    <Alert className="border-red-400/20 bg-red-500/10">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-200">{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Button
                      onClick={handleUpload}
                      disabled={!file || isUploading}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing Document...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Analyze with AI
                        </>
                      )}
                    </Button>
                    
                    {(file || analysis) && (
                      <Button 
                        variant="outline" 
                        onClick={resetUpload}
                        className="w-full border-white/20 text-white hover:bg-white/10"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audio Settings Card */}
            <Card className="shadow-2xl border-0 bg-white/5 backdrop-blur-xl border border-white/10">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-t-xl border-b border-white/5">
                <CardTitle className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Settings className="h-5 w-5 text-purple-400" />
                  </div>
                  Audio Settings
                </CardTitle>
                <CardDescription className="text-purple-200/70">
                  Control audio playback preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-xl border border-purple-400/20">
                    <div className="flex items-center space-x-3">
                      {audioEnabled ? (
                        <Volume2 className="h-5 w-5 text-purple-400" />
                      ) : (
                        <VolumeX className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <p className="text-white font-medium text-sm">Audio Responses</p>
                        <p className="text-purple-200/60 text-xs">Auto-play AI answers</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setAudioEnabled(!audioEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                        audioEnabled ? 'bg-purple-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        audioEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  <p className="text-xs text-blue-200/50 px-2">
                    {audioEnabled ? '✨ Audio will play automatically after each response' : '🔇 Audio is disabled - click play buttons manually'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-2xl border-0 bg-white/5 backdrop-blur-xl border border-white/10">
              <CardHeader className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-t-xl border-b border-white/5">
                <CardTitle className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-orange-400" />
                  </div>
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Button
                    onClick={clearChat}
                    disabled={chatHistory.length === 0}
                    variant="outline"
                    className="w-full border-red-400/20 text-red-400 hover:bg-red-500/10 hover:border-red-400/40"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Chat History
                  </Button>
                  {analysis && (
                    <Button
                      onClick={downloadSummary}
                      variant="outline"
                      className="w-full border-green-400/20 text-green-400 hover:bg-green-500/10 hover:border-green-400/40"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Summary
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Q&A Interface (70%) */}
          <div className="col-span-12 lg:col-span-8">
            <Card className="shadow-2xl border-0 bg-white/5 backdrop-blur-xl border border-white/10 h-full flex flex-col">
              
              {/* Chat Header */}
              <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-t-xl border-b border-white/5 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-white">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-emerald-400" />
                      </div>
                      Intelligent Q&A Assistant
                      {analysis && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-300">Ready</span>
                        </div>
                      )}
                    </CardTitle>
                    <CardDescription className="text-emerald-200/70">
                      Ask questions about your document using voice or text
                    </CardDescription>
                  </div>
                  {analysis && (
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-blue-500/20 rounded-full border border-blue-400/30">
                        <span className="text-xs text-blue-300 font-medium">
                          {chatHistory.length} {chatHistory.length === 1 ? 'conversation' : 'conversations'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>

              {/* Messages Area */}
              <CardContent className="flex-1 p-6 overflow-hidden flex flex-col">
                <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  
                  {/* Welcome State */}
                  {!analysis && !isUploading && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                      <div className="relative mb-8">
                        <div className="w-20 h-20 bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
                          <Bot className="h-10 w-10 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                          <Sparkles className="h-3 w-3 text-yellow-800" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3">Welcome to Bizbot</h3>
                      <p className="text-blue-200/80 text-lg max-w-md mx-auto leading-relaxed">
                        Upload a PDF document to unlock the power of AI-driven analysis and intelligent conversations.
                      </p>
                      <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-blue-300">
                          <Eye className="h-4 w-4" />
                          <span>Smart Analysis</span>
                        </div>
                        <div className="flex items-center gap-2 text-purple-300">
                          <MessageSquare className="h-4 w-4" />
                          <span>Natural Q&A</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-300">
                          <Volume2 className="h-4 w-4" />
                          <span>Audio Responses</span>
                        </div>
                        <div className="flex items-center gap-2 text-orange-300">
                          <BarChart3 className="h-4 w-4" />
                          <span>Data Insights</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading State */}
                  {isUploading && (
                    <div className="flex flex-col items-center justify-center h-full py-16">
                      <div className="relative mb-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                          <Loader2 className="h-8 w-8 text-white animate-spin" />
                        </div>
                        <div className="absolute inset-0 rounded-full border-4 border-blue-400/30 animate-ping"></div>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-3">Analyzing Your Document</h3>
                      <p className="text-blue-200/80 text-center max-w-md leading-relaxed">
                        Our advanced AI is processing your PDF and extracting valuable insights. This may take a few moments.
                      </p>
                      <div className="mt-6 flex items-center gap-2 text-sm text-blue-300">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span>Processing content...</span>
                      </div>
                    </div>
                  )}

                  {/* Analysis Summary */}
                  {analysis?.summary && (
                    <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl p-6 border border-blue-400/20 shadow-lg">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-xl flex-shrink-0">
                          <BarChart3 className="h-6 w-6 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center gap-2">
                            Document Analysis
                            <div className="px-2 py-1 bg-blue-500/20 rounded-full text-xs">AI Summary</div>
                          </h3>
                          <div className="text-white/90 leading-relaxed whitespace-pre-wrap mb-4">
                            {analysis.summary}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={handlePlayAudio}
                              size="sm"
                              variant="ghost"
                              className="text-blue-300 hover:text-blue-200 hover:bg-blue-500/10"
                            >
                              {isPlayingAudio ? (
                                <>
                                  <Pause className="h-4 w-4 mr-1" />
                                  Stop Audio
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-1" />
                                  Play Summary
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chat History */}
                  {chatHistory.map((chat, index) => (
                    <div key={index} className="space-y-4">
                      {/* Question */}
                      <div className="flex justify-end">
                        <div className="max-w-[75%] bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl rounded-tr-md px-6 py-4 shadow-lg">
                          <p className="font-medium leading-relaxed">{chat.question}</p>
                          <div className="mt-2 text-xs text-blue-100 opacity-75">
                            You • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                      
                      {/* Answer */}
                      {chat.answer && (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] bg-white/10 backdrop-blur text-white rounded-2xl rounded-tl-md px-6 py-4 border border-white/10 shadow-lg">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <Bot className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-emerald-300">Bizbot</span>
                                  <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                                  <span className="text-xs text-white/60">AI Assistant</span>
                                </div>
                                <p className="leading-relaxed text-white/90 mb-3">{chat.answer}</p>
                                
                                {/* Audio Control for Each Answer */}
                                <div className="flex items-center gap-2">
                                  <Button 
                                    onClick={() => playAnswerAudio(chat.answer)} 
                                    size="sm" 
                                    variant="ghost"
                                    className="text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 text-xs px-3 py-1 h-8"
                                  >
                                    <Play className="h-3 w-3 mr-1" />
                                    Play Audio
                                  </Button>
                                  <div className="text-xs text-white/40">
                                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Loading Indicator for Q&A */}
                  {qaLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/10 backdrop-blur rounded-2xl rounded-tl-md px-6 py-4 border border-white/10 shadow-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                            <span className="text-white/80 text-sm">Bizbot is thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="flex-shrink-0 mt-6 pt-6 border-t border-white/10">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Ask anything about your document..."
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !qaLoading && askQuestion()}
                          disabled={!analysis || qaLoading}
                          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-4 text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all pr-12"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1">
                          {audioEnabled && (
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Audio enabled"></div>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={startListening}
                        disabled={isListening || !analysis || qaLoading}
                        className={`px-4 py-4 rounded-xl ${
                          isListening 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                        } transition-all`}
                      >
                        <Mic className={`h-5 w-5 ${isListening ? 'animate-pulse' : ''}`} />
                      </Button>
                      <Button
                        onClick={askQuestion}
                        disabled={!question.trim() || qaLoading || !analysis}
                        className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                      >
                        {qaLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                    
                    {!analysis && (
                      <p className="text-center text-white/40 text-sm">
                        Upload and analyze a document to start conversations
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Document Stats Row */}
        {analysis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {analysis.page_count && (
              <Card className="shadow-lg border-0 bg-white/5 backdrop-blur-xl border border-white/10">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">{analysis.page_count}</div>
                  <div className="text-sm text-blue-200/80">Pages Analyzed</div>
                </CardContent>
              </Card>
            )}
            {analysis.word_count && (
              <Card className="shadow-lg border-0 bg-white/5 backdrop-blur-xl border border-white/10">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">{analysis.word_count.toLocaleString()}</div>
                  <div className="text-sm text-green-200/80">Words Processed</div>
                </CardContent>
              </Card>
            )}
            {analysis.key_points && (
              <Card className="shadow-lg border-0 bg-white/5 backdrop-blur-xl border border-white/10">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-orange-400 mb-2">{analysis.key_points.length}</div>
                  <div className="text-sm text-orange-200/80">Key Insights</div>
                </CardContent>
              </Card>
            )}
            <Card className="shadow-lg border-0 bg-white/5 backdrop-blur-xl border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">{chatHistory.length}</div>
                <div className="text-sm text-purple-200/80">Q&A Sessions</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Key Points Section */}
        {analysis?.key_points && analysis.key_points.length > 0 && (
          <Card className="shadow-2xl border-0 bg-white/5 backdrop-blur-xl border border-white/10 mt-8">
            <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-t-xl border-b border-white/5">
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Eye className="h-5 w-5 text-orange-400" />
                </div>
                Key Insights & Highlights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-4">
                {analysis.key_points.map((point, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-gradient-to-r from-orange-500/5 to-amber-500/5 rounded-xl border border-orange-400/10">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-white/90 leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Extracted Images */}
        {analysis?.images && analysis.images.length > 0 && (
          <Card className="shadow-2xl border-0 bg-white/5 backdrop-blur-xl border border-white/10 mt-8">
            <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-t-xl border-b border-white/5">
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Eye className="h-5 w-5 text-purple-400" />
                </div>
                Extracted Visual Content
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {analysis.images.map((imgPath, idx) => (
                  <div key={idx} className="group relative bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all">
                    <img
                      src={`http://localhost:8000/${imgPath}`}
                      alt={`Extracted content ${idx + 1}`}
                      className="rounded-lg shadow-lg border border-white/10 max-h-48 object-contain w-full bg-white/10 group-hover:shadow-xl transition-shadow"
                    />
                    <div className="mt-3 text-center">
                      <span className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded-full">
                        Figure {idx + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hidden Audio Player */}
      <audio id="audioPlayer" className="hidden" />
    </div>
  )
}
