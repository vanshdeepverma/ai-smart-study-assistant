import { useState } from 'react';
import { 
  useLearningMemories, 
  useDeleteLearningMemory, 
  useToggleMemoryResolution, 
  type MemoryCategory,
  type LearningMemoryItem 
} from '@/hooks/useLearningMemories';
import { 
  Brain, 
  Trash2, 
  CheckCircle, 
  HelpCircle, 
  AlertTriangle, 
  Sparkles, 
  BookOpen, 
  Loader2, 
  Quote
} from 'lucide-react';

export function LearningMemoryInspector() {
  const { data: memories, isLoading, isError } = useLearningMemories();
  const deleteMutation = useDeleteLearningMemory();
  const toggleResolutionMutation = useToggleMemoryResolution();
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  if (isLoading) {
    return (
      <div className="p-6 border rounded-xl bg-card flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>Loading AI Mentor memories...</span>
      </div>
    );
  }

  if (isError || !memories) {
    return null;
  }

  const filteredMemories = filterCategory === 'ALL' 
    ? memories 
    : memories.filter(m => m.category === filterCategory);

  const getCategoryBadge = (category: MemoryCategory) => {
    switch (category) {
      case 'CONCEPT_CONFUSION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <HelpCircle className="h-3 w-3" />
            Concept Confusion
          </span>
        );
      case 'REPEATED_MISTAKE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertTriangle className="h-3 w-3" />
            Repeated Mistake
          </span>
        );
      case 'LEARNING_STRENGTH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Sparkles className="h-3 w-3" />
            Learning Strength
          </span>
        );
      case 'STUDY_PREFERENCE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <BookOpen className="h-3 w-3" />
            Study Preference
          </span>
        );
    }
  };

  return (
    <div className="border rounded-xl bg-card p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight">Learning Memory Inspector</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Durable learning patterns, conceptual confusions, and strengths remembered by your AI Mentor.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-medium self-start sm:self-auto">
          {['ALL', 'CONCEPT_CONFUSION', 'LEARNING_STRENGTH', 'STUDY_PREFERENCE'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1.5 rounded-md transition-colors ${
                filterCategory === cat
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat === 'ALL' ? 'All' : cat === 'CONCEPT_CONFUSION' ? 'Confusions' : cat === 'LEARNING_STRENGTH' ? 'Strengths' : 'Preferences'}
            </button>
          ))}
        </div>
      </div>

      {filteredMemories.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <Brain className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">No active learning memories recorded yet.</p>
          <p className="text-xs text-muted-foreground/80 max-w-md mx-auto">
            As you chat with your AI Mentor and complete practice quizzes, meaningful learning patterns will automatically be remembered here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMemories.map((mem: LearningMemoryItem) => (
            <div 
              key={mem.id} 
              className={`p-4 rounded-xl border transition-all ${
                mem.isResolved 
                  ? 'bg-muted/40 opacity-75 border-dashed' 
                  : 'bg-card hover:border-primary/40 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {getCategoryBadge(mem.category)}
                  <span className="text-xs font-semibold text-foreground bg-accent px-2 py-0.5 rounded-md">
                    {mem.topic}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(mem.confidence * 100)}% Confidence
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => toggleResolutionMutation.mutate({ memoryId: mem.id, isResolved: !mem.isResolved })}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                      mem.isResolved
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'border-input text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {mem.isResolved ? 'Resolved' : 'Mark Resolved'}
                  </button>

                  <button
                    onClick={() => deleteMutation.mutate(mem.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    title="Delete Memory"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm font-medium text-foreground mt-1">
                {mem.content}
              </p>

              {mem.evidence && (
                <div className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-lg border flex items-start gap-2 italic">
                  <Quote className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 mt-0.5" />
                  <span>"{mem.evidence}"</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
