import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { BrainCircuit, BookOpen, Target, Zap } from "lucide-react";

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <BrainCircuit className="h-6 w-6" />
            AI Smart Study
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl mb-8">
            Master your exams with <br />
            <span className="text-primary">AI-Powered Study Tools</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10">
            Upload your lecture slides and textbooks. Our AI extracts the context, generates flashcards, quizzes, and helps you identify your weak spots instantly.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="h-12 px-8 text-base">Start Studying For Free</Button>
            </Link>
          </div>

          <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center p-6 bg-card rounded-2xl shadow-sm border">
              <div className="p-3 bg-primary/10 rounded-full mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Smart Documents</h3>
              <p className="text-muted-foreground text-sm">Upload PDFs and let AI organize the knowledge.</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-card rounded-2xl shadow-sm border">
              <div className="p-3 bg-primary/10 rounded-full mb-4">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Targeted Quizzes</h3>
              <p className="text-muted-foreground text-sm">Generate MCQs automatically from your notes.</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-card rounded-2xl shadow-sm border">
              <div className="p-3 bg-primary/10 rounded-full mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Instant Answers</h3>
              <p className="text-muted-foreground text-sm">Ask questions and get answers with exact citations.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
