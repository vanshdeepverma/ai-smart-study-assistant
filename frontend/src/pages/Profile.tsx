import { useState, useEffect } from 'react';
import { useMentorProfile, useUpdateMentorProfile } from '@/hooks/useMentorProfile';
import { LearningMemoryInspector } from '@/components/mentor/LearningMemoryInspector';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  User, BookOpen, MessageSquare, Award, AlertCircle, 
  CheckCircle2, FileText, HelpCircle, Save, Sparkles, Loader2 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ModeToggle } from '@/components/mode-toggle';

export function Profile() {
  const { data, isLoading, isError, error } = useMentorProfile();
  const updateProfileMutation = useUpdateMentorProfile();

  const [preferredStyle, setPreferredStyle] = useState<'ANALOGY' | 'STEP_BY_STEP' | 'FORMAL'>('ANALOGY');
  const [academicGoal, setAcademicGoal] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (data?.profile) {
      setPreferredStyle(data.profile.preferredStyle || 'ANALOGY');
      setAcademicGoal(data.profile.academicGoal || '');
    }
  }, [data]);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    updateProfileMutation.mutate(
      { preferredStyle, academicGoal },
      {
        onSuccess: () => {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading Student Learning Profile...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 border rounded-lg bg-destructive/10 text-destructive space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load student learning profile</span>
        </div>
        <p className="text-sm">{(error as Error)?.message || 'An error occurred while communicating with the server.'}</p>
      </div>
    );
  }

  const { user, stats, activity, mastery } = data;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <User className="h-8 w-8 text-primary" />
            My Learning Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time educational progress, study metrics, and AI Mentor preferences.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">AI Mentor Active</span>
          </div>
        </div>
      </div>

      {/* Real Activity Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uploaded Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.readyDocuments} <span className="text-sm font-normal text-muted-foreground">/ {stats.totalDocuments} Ready</span></div>
            <p className="text-xs text-muted-foreground mt-1">Processed for RAG Search</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChatSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.totalChatMessages} total messages exchanged</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes Attempted</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuizzesAttempted}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed practice evaluations</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Quiz Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageQuizScore !== null ? `${stats.averageQuizScore}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.averageQuizScore !== null ? 'Based on stored attempt scores' : 'Take a quiz to see score'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Preferences & Derived Mastery */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Settings & Mentor Preferences Form */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Mentor Preferences
            </CardTitle>
            <CardDescription>Customize how the AI Mentor presents explanations and structures feedback.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePreferences} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Student Name
                </label>
                <Input value={user.name} disabled className="bg-muted/50" />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Email Address
                </label>
                <Input value={user.email} disabled className="bg-muted/50" />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Academic Goal
                </label>
                <Input 
                  placeholder="e.g. Prepare for Computer Networks Exam"
                  value={academicGoal}
                  onChange={(e) => setAcademicGoal(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Preferred Explanation Style
                </label>
                <select
                  value={preferredStyle}
                  onChange={(e) => setPreferredStyle(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ANALOGY">Analogy-Driven (Real-World Examples)</option>
                  <option value="STEP_BY_STEP">Step-by-Step (Structured Logical Breakdown)</option>
                  <option value="FORMAL">Formal / Technical (Academic Precision)</option>
                </select>
              </div>

              <Button type="submit" disabled={updateProfileMutation.isPending} className="w-full gap-2 mt-2">
                {updateProfileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Preferences
              </Button>

              {saveSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium justify-center pt-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Preferences updated!
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Learning Performance & Memory Inspector */}
        <div className="md:col-span-2 space-y-6">
          {/* AI Mentor Memory Inspector */}
          <LearningMemoryInspector />

          {/* Topic Performance Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Topic Performance & Mastery Overview
              </CardTitle>
              <CardDescription>Automatically derived from your completed quiz attempts and document notes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Topics Needing Practice */}
                <div className="p-4 border rounded-lg bg-amber-500/5 border-amber-500/20">
                  <h4 className="font-semibold text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4" />
                    Topics Needing Practice (&lt; 70% Score)
                  </h4>
                  {mastery.topicsNeedingPractice.length > 0 ? (
                    <div className="space-y-2">
                      {mastery.topicsNeedingPractice.map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-background border text-xs">
                          <span className="font-medium truncate pr-2">{t.title}</span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold shrink-0">
                            {t.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No weak topics detected yet. Complete practice quizzes to identify areas for improvement.</p>
                  )}
                </div>

                {/* Strong Topics */}
                <div className="p-4 border rounded-lg bg-green-500/5 border-green-500/20">
                  <h4 className="font-semibold text-green-600 dark:text-green-400 text-sm flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4" />
                    Strong Topics (&ge; 70% Score)
                  </h4>
                  {mastery.strongTopics.length > 0 ? (
                    <div className="space-y-2">
                      {mastery.strongTopics.map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-background border text-xs">
                          <span className="font-medium truncate pr-2">{t.title}</span>
                          <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-300 font-semibold shrink-0">
                            {t.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No mastered topics logged yet. Keep studying and taking quizzes!</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Sections */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Recent Conversations */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Recent Study Chats
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activity.recentConversations.length > 0 ? (
                  <div className="space-y-2">
                    {activity.recentConversations.map((chat) => (
                      <Link 
                        key={chat.id} 
                        to={`/chat/${chat.id}`}
                        className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 transition-colors text-xs"
                      >
                        <span className="font-medium truncate pr-2">{chat.title}</span>
                        <span className="text-muted-foreground text-[10px] shrink-0">
                          {chat.messageCount} msgs
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No study chats yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Quiz Attempts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Recent Quiz Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activity.recentQuizAttempts.length > 0 ? (
                  <div className="space-y-2">
                    {activity.recentQuizAttempts.map((attempt) => (
                      <div key={attempt.id} className="flex items-center justify-between p-2 rounded border text-xs">
                        <div className="truncate pr-2">
                          <p className="font-medium truncate">{attempt.quizTitle}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{attempt.documentName}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-semibold text-[11px] shrink-0 ${
                          attempt.score >= 70 
                            ? 'bg-green-500/20 text-green-700 dark:text-green-300' 
                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        }`}>
                          {attempt.score}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No quiz attempts yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
