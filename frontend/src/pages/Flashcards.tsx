import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RotateCcw, Loader2, Layers, BrainCircuit, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFlashcards, useGenerateFlashcards, useDeleteFlashcard, useRateFlashcard } from "@/hooks/useFlashcards";
import { useDocuments } from "@/hooks/useDocuments";

export function Flashcards() {
  const [flipped, setFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [errorMsg, setErrorMsg] = useState("");
  
  const { data: flashcards, isLoading } = useFlashcards();
  const { data: documents } = useDocuments();
  const generateMutation = useGenerateFlashcards();
  const deleteMutation = useDeleteFlashcard();
  const rateMutation = useRateFlashcard();
  const [ratingMessage, setRatingMessage] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!selectedDoc) {
      setErrorMsg("Please select a study document first.");
      return;
    }
    setErrorMsg("");
    setFlipped(false);
    setCurrentIndex(0);
    try {
      await generateMutation.mutateAsync({ documentId: selectedDoc, difficulty });
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to generate flashcards.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      if (currentIndex > 0 && flashcards && currentIndex === flashcards.length - 1) {
        setCurrentIndex(currentIndex - 1);
      }
      setFlipped(false);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to delete flashcard.");
    }
  };

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="space-y-8 flex flex-col items-center justify-center h-[calc(100vh-8rem)] max-w-lg mx-auto w-full">
        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Layers className="h-10 w-10 text-primary/50" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">No Flashcards Yet</h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            Your flashcard deck is currently empty. The AI can generate smart flashcards from your study materials.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 w-full">
          <select 
            className="w-full max-w-xs p-2 border rounded-md"
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
          >
            <option value="">Select a document...</option>
            {documents?.filter(d => d.status === 'READY').map(d => (
              <option key={d.id} value={d.id}>{d.filename}</option>
            ))}
          </select>

          <select 
            className="w-full max-w-xs p-2 border rounded-md"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>

          <Button 
            onClick={handleGenerate} 
            disabled={generateMutation.isPending || !selectedDoc} 
            className="gap-2 w-full max-w-xs mt-2"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BrainCircuit className="h-4 w-4" />
            )}
            {generateMutation.isPending ? "Generating..." : "Generate Flashcards"}
          </Button>

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm text-center w-full max-w-xs">
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setFlipped(false);
      setRatingMessage("");
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setFlipped(false);
      setRatingMessage("");
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleRate = async (rating: 'HARD' | 'GOOD' | 'EASY') => {
    try {
      setRatingMessage("");
      await rateMutation.mutateAsync({ id: currentCard.id, rating });
      setRatingMessage("Saved");
      setTimeout(() => setRatingMessage(""), 2000);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to save rating.");
    }
  };

  const currentRating = currentCard.progress && currentCard.progress.length > 0 ? currentCard.progress[0].rating : null;

  return (
    <div className="space-y-8 flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Study Flashcards</h1>
        <p className="text-muted-foreground mt-2">Card {currentIndex + 1} of {flashcards.length}</p>
        {currentCard.document && (
          <p className="text-xs text-muted-foreground mt-1 bg-muted inline-block px-2 py-1 rounded">
            Source: {currentCard.document.filename}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 w-full justify-center">
        <Button variant="ghost" size="icon" onClick={handlePrev} disabled={currentIndex === 0}>
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div 
          className="relative w-full max-w-2xl h-80 perspective-1000 cursor-pointer group"
          onClick={() => setFlipped(!flipped)}
        >
          <Card className={`absolute w-full h-full transition-all duration-500 transform-style-3d ${flipped ? 'rotate-x-180 opacity-0' : 'opacity-100'}`}>
            <CardContent className="flex flex-col items-center justify-center h-full text-center p-8">
              <h2 className="text-2xl font-medium">{currentCard.front}</h2>
              <div className="absolute bottom-6 text-muted-foreground flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                <span className="text-sm">Click to flip</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className={`absolute w-full h-full transition-all duration-500 transform-style-3d ${!flipped ? '-rotate-x-180 opacity-0' : 'opacity-100'} bg-primary/5 border-primary/20 overflow-y-auto`}>
            <CardContent className="flex flex-col items-center justify-center min-h-full text-center p-8">
              <p className="text-lg whitespace-pre-wrap">{currentCard.back}</p>
            </CardContent>
          </Card>
        </div>

        <Button variant="ghost" size="icon" onClick={handleNext} disabled={currentIndex === flashcards.length - 1}>
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
      
      <div className="flex gap-4 items-center relative">
        <Button 
          variant={currentRating === 'HARD' ? 'default' : 'outline'} 
          className={`w-32 ${currentRating === 'HARD' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
          onClick={() => handleRate('HARD')}
          disabled={rateMutation.isPending}
        >
          {rateMutation.isPending && rateMutation.variables?.rating === 'HARD' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Hard
        </Button>
        <Button 
          variant={currentRating === 'GOOD' ? 'default' : 'outline'} 
          className={`w-32 ${currentRating === 'GOOD' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'border-yellow-200 text-yellow-600 hover:bg-yellow-50'}`}
          onClick={() => handleRate('GOOD')}
          disabled={rateMutation.isPending}
        >
          {rateMutation.isPending && rateMutation.variables?.rating === 'GOOD' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Good
        </Button>
        <Button 
          variant={currentRating === 'EASY' ? 'default' : 'outline'} 
          className={`w-32 ${currentRating === 'EASY' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
          onClick={() => handleRate('EASY')}
          disabled={rateMutation.isPending}
        >
          {rateMutation.isPending && rateMutation.variables?.rating === 'EASY' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Easy
        </Button>
        
        {ratingMessage && (
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
            {ratingMessage}
          </span>
        )}

        <div className="w-px h-8 bg-border mx-2"></div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => handleDelete(currentCard.id)}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex items-center gap-4 w-full max-w-2xl pt-4 border-t">
        <div className="flex flex-col flex-1 gap-2">
          <div className="flex gap-2">
            <select 
              className="flex-1 p-2 border rounded-md text-sm"
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
            >
              <option value="">Select a document to generate more...</option>
              {documents?.filter(d => d.status === 'READY').map(d => (
                <option key={d.id} value={d.id}>{d.filename}</option>
              ))}
            </select>

            <select 
              className="w-32 p-2 border rounded-md text-sm"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          
          {errorMsg && (
            <div className="p-2 bg-red-50 text-red-700 rounded-md text-xs text-center w-full">
              {errorMsg}
            </div>
          )}
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={generateMutation.isPending || !selectedDoc} 
          className="gap-2"
        >
          {generateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BrainCircuit className="h-4 w-4" />
          )}
          Generate More
        </Button>
      </div>
    </div>
  );
}
