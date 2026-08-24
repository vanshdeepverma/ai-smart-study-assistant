import { Bell, Search, UserCircle } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex w-full max-w-md items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input type="search" placeholder="Search documents or quizzes..." className="h-9 w-full bg-background/50 border-0 focus-visible:ring-0" />
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 border-l pl-4">
          <UserCircle className="h-8 w-8 text-primary" />
          <div className="hidden flex-col md:flex">
            <span className="text-sm font-medium">Alex CS</span>
            <span className="text-xs text-muted-foreground">Student</span>
          </div>
        </div>
      </div>
    </header>
  );
}
