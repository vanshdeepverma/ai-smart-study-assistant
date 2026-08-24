import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Clock, BookOpen, Target, TrendingUp, Plus, Sparkles, AlertCircle, CheckCircle2, X, Brain, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboard } from "@/hooks/useDashboard";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

export function Dashboard() {
  const { data: stats, isLoading, error, refetch } = useDashboard();
  const [dismissingIds, setDismissingIds] = useState<Record<string, boolean>>({});

  const handleDismissRecommendation = async (recId: string) => {
    try {
      setDismissingIds(prev => ({ ...prev, [recId]: true }));
      await apiFetch(`/mentor/recommendations/${recId}/dismiss`, { method: 'POST' });
      await refetch();
    } catch (err) {
      console.error('Failed to dismiss recommendation:', err);
    } finally {
      setDismissingIds(prev => ({ ...prev, [recId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-muted-foreground">
        <p>Failed to load dashboard data.</p>
        <p className="text-sm">Please try refreshing the page.</p>
      </div>
    );
  }

  const activeRecs = (stats.recommendations || []).filter(r => !r.isDismissed);

  return (
    <div className="space-y-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Mentor Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {stats.userName || 'Student'}. Here is your continuous learning progress.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/chat">
            <Button variant="outline" className="gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Ask AI Mentor
            </Button>
          </Link>
          <Link to="/documents">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Upload Document
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">+{stats.newDocumentsThisWeek} this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.quizzesTaken}</div>
            <p className="text-xs text-muted-foreground">Avg score: {stats.averageScore}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studyTime}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.currentStreak} Days</div>
            <p className="text-xs text-muted-foreground">Keep it up!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Memories</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.activeMemoriesCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active insights recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Personalized Actionable Recommendations Banner */}
      {activeRecs.length > 0 && (
        <Card className="border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-lg">Personalized Study Recommendations</CardTitle>
            </div>
            <CardDescription>
              Based on your recent quiz scores, active concept confusions, and topic mastery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              {activeRecs.map((rec) => (
                <div 
                  key={rec.id} 
                  className="relative flex flex-col justify-between p-4 rounded-xl border bg-background shadow-sm space-y-3"
                >
                  <button
                    onClick={() => handleDismissRecommendation(rec.id)}
                    disabled={dismissingIds[rec.id]}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
                    title="Dismiss recommendation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="pr-6 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                        {rec.topicName}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm">{rec.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rec.reason}</p>
                  </div>
                  <div className="pt-2 flex items-center gap-2">
                    {rec.actionType === 'PRACTICE_QUIZ' ? (
                      <Link to="/quizzes" className="w-full">
                        <Button size="sm" className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                          <Target className="h-3.5 w-3.5" />
                          Start Practice Quiz
                        </Button>
                      </Link>
                    ) : (
                      <Link to="/chat" className="w-full">
                        <Button size="sm" variant="outline" className="w-full gap-2 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Revise with AI Mentor
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Grid: Weak Topics & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Topic Mastery & Weaknesses Widget */}
        <Card className="col-span-4 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Topic Mastery & Evidence Snapshot
                </CardTitle>
                <CardDescription>
                  Evidence-based mastery scores computed from quizzes & diagnostic checks.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {(!stats.weakTopics || stats.weakTopics.length === 0) && (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                <p className="text-sm font-medium">No weak topics detected yet!</p>
                <p className="text-xs text-muted-foreground">Take a quiz or chat with your AI Mentor to generate topic performance insights.</p>
              </div>
            )}
            
            {stats.weakTopics && stats.weakTopics.map((topic) => (
              <div key={topic.id || topic.name} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{topic.name}</span>
                    {topic.masteryLabel && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        topic.masteryLabel === 'WEAK' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                        topic.masteryLabel === 'NEEDS_PRACTICE' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                        topic.masteryLabel === 'GOOD' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                        'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                      }`}>
                        {topic.masteryLabel}
                      </span>
                    )}
                  </div>
                  <span className={`font-bold ${topic.text}`}>{topic.mastery}%</span>
                </div>
                
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full transition-all ${topic.color}`} style={{ width: `${topic.mastery}%` }} />
                </div>
                
                {topic.evidenceSummary && (
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    💡 {topic.evidenceSummary}
                  </p>
                )}
              </div>
            ))}

            <Link to="/quizzes">
              <Button variant="outline" className="w-full mt-2 gap-2" disabled={!stats.weakTopics || stats.weakTopics.length === 0}>
                <Target className="h-4 w-4" />
                Practice Weak Topic Quizzes
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity Card */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="text-xl">Recent Activity</CardTitle>
            <CardDescription>Latest processed documents & study sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No recent activity.</p>
              )}
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 border-b pb-3 last:border-0 last:pb-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">Processed & vectorized • {new Date(activity.timeAgo).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
