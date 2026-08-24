import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useQuizzes, useQuizDetail, useGenerateQuiz, useSubmitQuizAttempt, type Question } from "@/hooks/useQuizzes";
import { useDocuments } from "@/hooks/useDocuments";
import { Loader2, BrainCircuit, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Award, HelpCircle, FileText, Plus } from "lucide-react";

export function Quiz() {
  const { data: quizzes, isLoading: isLoadingQuizzes } = useQuizzes();
  const { data: documents } = useDocuments();
  const generateMutation = useGenerateQuiz();
  const submitMutation = useSubmitQuizAttempt();

  // Active state
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [attemptResult, setAttemptResult] = useState<any | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('MEDIUM');
  const [generationError, setGenerationError] = useState<string>('');

  const { data: activeQuiz, isLoading: isLoadingDetail } = useQuizDetail(selectedQuizId);

  const readyDocuments = documents?.filter(d => d.status === 'READY') || [];

  // Handle starting a quiz
  const handleStartQuiz = (quizId: string) => {
    setSelectedQuizId(quizId);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setAttemptResult(null);
  };

  // Handle option select
  const handleSelectOption = (questionId: string, option: string) => {
    if (attemptResult) return; // Cannot change after submit
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  // Handle Quiz Submission
  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !activeQuiz.questions) return;
    
    const formattedAnswers = Object.entries(selectedAnswers).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption
    }));

    if (formattedAnswers.length === 0) {
      alert('Please answer at least one question before submitting.');
      return;
    }

    try {
      const result = await submitMutation.mutateAsync({
        quizId: activeQuiz.id,
        answers: formattedAnswers
      });
      setAttemptResult(result);
    } catch (err: any) {
      console.error('Quiz submission failed:', err);
    }
  };

  // Handle Generate Submit
  const handleGenerateQuiz = async () => {
    if (!selectedDocumentId) {
      setGenerationError('Please select a document');
      return;
    }

    setGenerationError('');
    try {
      const newQuiz = await generateMutation.mutateAsync({
        documentId: selectedDocumentId,
        difficulty
      });
      setIsGenerateModalOpen(false);
      handleStartQuiz(newQuiz.id);
    } catch (err: any) {
      setGenerationError(err.message || 'Failed to generate quiz');
    }
  };

  if (isLoadingQuizzes) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE QUIZ / PLAYING VIEW
  // -------------------------------------------------------------
  if (selectedQuizId && activeQuiz) {
    if (isLoadingDetail) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    const questions: Question[] = activeQuiz.questions || [];
    const currentQ = questions[currentQuestionIndex];
    const totalQuestions = questions.length;
    const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedQuizId(null)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Quizzes
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 text-primary" />
            <span>{activeQuiz.document?.filename || 'Document Quiz'}</span>
          </div>
        </div>

        {/* QUIZ ATTEMPT RESULTS VIEW */}
        {attemptResult ? (
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="text-center pb-4 border-b">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Quiz Results</CardTitle>
              <CardDescription>{activeQuiz.title}</CardDescription>
              <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-xl">
                Score: {attemptResult.score}%
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <h3 className="font-semibold text-lg">Detailed Question Breakdown:</h3>
              <div className="space-y-4">
                {attemptResult.answers?.map((ansRecord: any, idx: number) => {
                  const q = ansRecord.question;
                  const isCorrect = ansRecord.isCorrect;
                  return (
                    <div key={ansRecord.id || idx} className={`p-4 rounded-lg border ${isCorrect ? 'bg-green-500/5 border-green-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
                      <div className="flex items-start gap-3">
                        {isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-2 flex-1">
                          <p className="font-medium text-foreground">
                            {idx + 1}. {q?.text || 'Question'}
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Your Answer: </span>
                            <span className={`font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                              {ansRecord.selectedOption}
                            </span>
                          </p>
                          {!isCorrect && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Correct Answer: </span>
                              <span className="font-semibold text-green-600">
                                {q?.correctAnswer}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center gap-4 pt-4 border-t">
                <Button 
                  onClick={() => {
                    setAttemptResult(null);
                    setCurrentQuestionIndex(0);
                    setSelectedAnswers({});
                  }}
                  variant="outline"
                >
                  Retake Quiz
                </Button>
                <Button onClick={() => setSelectedQuizId(null)}>
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* ACTIVE QUESTION STEPPER VIEW */
          <Card className="shadow-md">
            <CardHeader className="pb-4 border-b">
              <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
                <span className="capitalize px-2 py-0.5 rounded bg-muted text-xs font-semibold">{activeQuiz.difficulty}</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
              <CardTitle className="text-xl pt-4">{currentQ?.text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-3">
                {currentQ?.options?.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[currentQ.id] === opt;
                  return (
                    <button
                      key={optIdx}
                      id={`option-btn-${optIdx}`}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, opt)}
                      className={`w-full text-left p-4 rounded-lg border transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'border-primary bg-primary/10 font-medium text-foreground ring-1 ring-primary' 
                          : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <span>{opt}</span>
                      <div className={`h-5 w-5 rounded-full border flex items-center justify-center text-xs font-semibold ${
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-between pt-6 border-t mt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>

                {currentQuestionIndex < totalQuestions - 1 ? (
                  <Button
                    id="next-question-btn"
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                    disabled={!selectedAnswers[currentQ?.id]}
                    className="gap-2"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    id="submit-quiz-btn"
                    onClick={handleSubmitQuiz}
                    disabled={submitMutation.isPending || Object.keys(selectedAnswers).length === 0}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Submit Quiz
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // QUIZ LIBRARY / MAIN VIEW
  // -------------------------------------------------------------
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Quizzes</h1>
          <p className="text-muted-foreground mt-1">Test your memory with generated practice quizzes from your study notes.</p>
        </div>
        <Button 
          id="generate-quiz-btn"
          onClick={() => setIsGenerateModalOpen(true)} 
          className="gap-2 shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          Generate New Quiz
        </Button>
      </div>

      {/* GENERATE MODAL */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl">Generate AI Quiz</CardTitle>
              </div>
              <CardDescription>Select a study document to extract AI questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generationError && (
                <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">
                  {generationError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Study Document</label>
                <select
                  className="w-full p-2.5 rounded-md border bg-background text-sm focus:ring-1 focus:ring-primary"
                  value={selectedDocumentId}
                  onChange={(e) => setSelectedDocumentId(e.target.value)}
                >
                  <option value="">
                    {readyDocuments.length === 0 ? '-- No READY documents found (Upload PDF first) --' : '-- Select a document --'}
                  </option>
                  {readyDocuments.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.filename}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty Level</label>
                <select
                  className="w-full p-2.5 rounded-md border bg-background text-sm focus:ring-1 focus:ring-primary"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsGenerateModalOpen(false)}
                  disabled={generateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerateQuiz} 
                  disabled={generateMutation.isPending || !selectedDocumentId}
                  className="gap-2"
                >
                  {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                  {generateMutation.isPending ? 'Generating Quiz...' : 'Generate Quiz'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QUIZ LIST */}
      {!quizzes || quizzes.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">No Quizzes Generated Yet</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
            Generate your first interactive multiple-choice practice quiz from your uploaded PDF notes.
          </p>
          <Button id="generate-quiz-empty-btn" onClick={() => setIsGenerateModalOpen(true)} className="mt-6 gap-2">
            <Plus className="h-4 w-4" /> Generate Practice Quiz
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
                    {quiz.difficulty}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(quiz.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <CardTitle className="text-lg line-clamp-1">{quiz.title}</CardTitle>
                <CardDescription className="text-xs flex items-center gap-1.5 pt-1">
                  <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{quiz.document?.filename || 'Document'}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex items-center justify-between border-t mt-3 py-3 bg-muted/20">
                <span className="text-xs text-muted-foreground font-medium">
                  {quiz._count?.questions || 0} Questions
                </span>
                <Button size="sm" onClick={() => handleStartQuiz(quiz.id)}>
                  Start Quiz
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
