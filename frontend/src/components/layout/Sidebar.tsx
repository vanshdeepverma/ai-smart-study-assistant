import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  FileText, HelpCircle, Layers, 
  User, ShieldAlert, LogOut, Plus, MessageSquare, LayoutDashboard 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { useChatSessions } from "@/hooks/useChat";
import { Button } from "@/components/ui/Button";

const workspaceItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Study Material", href: "/documents", icon: FileText },
  { name: "Practice Quizzes", href: "/quizzes", icon: HelpCircle },
  { name: "Flashcards", href: "/flashcards", icon: Layers },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: sessions } = useChatSessions();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => navigate('/login')
    });
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card px-3 py-4">
      <div className="mb-4">
        <Button 
          className="w-full justify-start gap-2" 
          onClick={() => navigate('/chat')}
        >
          <Plus className="h-4 w-4" />
          New Mentor Session
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Chat History */}
        {user?.role !== 'ADMIN' && (
          <div>
            <div className="px-3 mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Mentor Sessions
              </h3>
            </div>
            <nav className="space-y-1">
              {sessions?.map((session) => {
                const isActive = location.pathname === `/chat/${session.id}`;
                return (
                  <Link
                    key={session.id}
                    to={`/chat/${session.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors truncate",
                      isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="truncate">{session.title}</span>
                  </Link>
                );
              })}
              {(!sessions || sessions.length === 0) && (
                <p className="px-3 py-2 text-xs text-muted-foreground italic">No recent chats</p>
              )}
            </nav>
          </div>
        )}

        {/* Workspace Tools */}
        {user?.role !== 'ADMIN' && (
          <div>
            <div className="px-3 mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Workspace
              </h3>
            </div>
            <nav className="space-y-1">
              {workspaceItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Actions */}
      <div className="mt-auto pt-4 space-y-1 border-t">
        <Link
          to="/profile"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            location.pathname === "/profile" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <User className="h-4 w-4 shrink-0" />
          Profile
        </Link>
        {user?.role === 'ADMIN' && (
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              location.pathname === "/admin" ? "bg-red-500/10 text-red-500 font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <ShieldAlert className="h-4 w-4 shrink-0" />
            Admin Panel
          </Link>
        )}
        <button
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {logoutMutation.isPending ? 'Logging out...' : 'Log Out'}
        </button>
      </div>
    </div>
  );
}
