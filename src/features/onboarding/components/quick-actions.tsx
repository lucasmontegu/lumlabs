"use client";

import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  icon: string;
  title: string;
  description: string;
  prompt: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "change-ui",
    icon: "🎨",
    title: "Cambiar algo en la UI",
    description: "Modificar el diseño o apariencia",
    prompt: "Quiero modificar ",
  },
  {
    id: "add-feature",
    icon: "✨",
    title: "Agregar una nueva feature",
    description: "Construir nueva funcionalidad",
    prompt: "Quiero agregar ",
  },
  {
    id: "fix-bug",
    icon: "🐛",
    title: "Arreglar un problema",
    description: "Solucionar bugs o errores",
    prompt: "Hay un problema con ",
  },
  {
    id: "explain",
    icon: "📖",
    title: "Explicame como funciona",
    description: "Entender el codigo existente",
    prompt: "Explicame como funciona ",
  },
];

interface QuickActionsProps {
  onSelect: (prompt: string) => void;
  className?: string;
}

export function QuickActions({ onSelect, className }: QuickActionsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          onClick={() => onSelect(action.prompt)}
          className={cn(
            "flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4",
            "text-left transition-all",
            "hover:border-primary/50 hover:bg-accent/50",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          )}
        >
          <span className="text-2xl">{action.icon}</span>
          <div>
            <h3 className="font-medium text-sm">{action.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {action.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
