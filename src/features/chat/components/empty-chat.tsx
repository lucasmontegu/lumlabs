"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  Settings01Icon,
  Analytics01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { ChatInput } from "./chat-input";

interface SuggestionCardProps {
  icon: IconSvgElement;
  title: string;
  description: string;
  onClick: () => void;
}

function SuggestionCard({ icon, title, description, onClick }: SuggestionCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card/80 p-4 text-left transition-all hover:bg-card hover:shadow-md hover:border-border"
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
        <HugeiconsIcon icon={icon} className="size-5 text-foreground" />
      </div>
      <div>
        <h3 className="font-medium text-sm leading-tight">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </button>
  );
}

interface EmptyChatProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  branches?: string[];
}

export function EmptyChat({
  onSendMessage,
  isLoading = false,
  branches = [],
}: EmptyChatProps) {
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSuggestionClick = (prompt: string) => {
    // For now just trigger send directly
    onSendMessage(prompt);
  };

  const suggestions = [
    {
      icon: DashboardSquare01Icon,
      title: "Crear un dashboard",
      description: "Panel de métricas",
      prompt: "Quiero crear un dashboard con métricas de ventas y usuarios activos",
    },
    {
      icon: Settings01Icon,
      title: "Agregar configuración",
      description: "Preferencias de usuario",
      prompt: "Necesito agregar una página de configuración con preferencias de usuario",
    },
    {
      icon: Analytics01Icon,
      title: "Gráficos interactivos",
      description: "Visualización de datos",
      prompt: "Quiero agregar gráficos interactivos para visualizar datos de ventas",
    },
  ];

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background: "linear-gradient(180deg, var(--gradient-start) 0%, var(--gradient-mid) 40%, var(--gradient-end) 100%)",
      }}
    >
      {/* Main content area - centered */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-xl space-y-8">
          {/* Logo Icon */}
          <div className="flex justify-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
              <span className="text-2xl font-bold">L</span>
            </div>
          </div>

          {/* Greeting */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl text-muted-foreground">
              Hola, bienvenido
            </h1>
            <p className="text-3xl font-semibold tracking-tight">
              ¿Qué quieres construir hoy?
            </p>
            <p className="text-muted-foreground max-w-md mx-auto">
              Describe lo que necesitas y lo construiré por ti,
              desde nuevas funciones hasta mejoras de diseño.
            </p>
          </div>

          {/* Suggestion Cards */}
          <div className="grid grid-cols-3 gap-3 pt-4">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.title}
                icon={suggestion.icon}
                title={suggestion.title}
                description={suggestion.description}
                onClick={() => handleSuggestionClick(suggestion.prompt)}
              />
            ))}
          </div>

          {/* Chat Input */}
          <div className="pt-4">
            <ChatInput
              onSend={onSendMessage}
              disabled={isLoading}
              placeholder="Describe lo que quieres construir..."
              branches={branches}
              showSelectors={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
