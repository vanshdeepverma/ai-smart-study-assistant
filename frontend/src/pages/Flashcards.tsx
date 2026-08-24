import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RotateCcw, Loader2, Layers, BrainCircuit } from "lucide-react";
import { useState } from "react";
import { useFlashcards } from "@/hooks/useFlashcards";

export function Flashcards() {
  const [flipped, setFlipped] = useState(false);
  const { data: flashcards, isLoading } = useFlashcards();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="space-y-8 flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Layers className="h-10 w-10 text-primary/50" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">No Flashcards Yet</h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            Your flashcard deck is currently empty. The AI can generate smart flashcards from your study materials.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Button disabled className="gap-2 opacity-50">
            <BrainCircuit className="h-4 w-4" />
            Generate Flashcards
          </Button>
          <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
            NOT IMPLEMENTED (Requires Phase 6 AI Pipeline)
          </span>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[0]; // Simple implementation for now

  return (
    <div className="space-y-8 flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Study Flashcards</h1>
        <p className="text-muted-foreground mt-2">Card 1 of {flashcards.length}</p>
      </div>

      <div 
        className="relative w-full max-w-2xl h-80 perspective-1000 cursor-pointer group"
        onClick={() => setFlipped(!flipped)}
      >
        <Card className={`absolute w-full h-full transition-all duration-500 transform-style-3d ${flipped ? 'rotate-x-180 opacity-0' : 'opacity-100'}`}>
          <CardContent className="flex flex-col items-center justify-center h-full text-center p-8">
            <h2 className="text-2xl font-medium">{currentCard.front}</h2>
            <div className="mt-8 text-muted-foreground flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              <span className="text-sm">Click to flip</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`absolute w-full h-full transition-all duration-500 transform-style-3d ${!flipped ? '-rotate-x-180 opacity-0' : 'opacity-100'} bg-primary/5 border-primary/20`}>
          <CardContent className="flex flex-col items-center justify-center h-full text-center p-8">
            <p className="text-lg">{currentCard.back}</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex gap-4">
        <Button variant="outline" className="w-32 border-red-200 text-red-600 hover:bg-red-50">Hard</Button>
        <Button variant="outline" className="w-32 border-yellow-200 text-yellow-600 hover:bg-yellow-50">Good</Button>
        <Button variant="outline" className="w-32 border-green-200 text-green-600 hover:bg-green-50">Easy</Button>
      </div>
    </div>
  );
}
