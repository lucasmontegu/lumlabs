"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Clock01Icon,
  Mail01Icon,
  Home01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface InviteAcceptClientProps {
  error: string;
  type: "invalid" | "expired" | "wrong_email" | "error";
  invitedEmail?: string;
  currentEmail?: string;
}

export function InviteAcceptClient({
  error,
  type,
  invitedEmail,
  currentEmail,
}: InviteAcceptClientProps) {
  const getIcon = () => {
    switch (type) {
      case "expired":
        return Clock01Icon;
      case "wrong_email":
        return Mail01Icon;
      default:
        return AlertCircleIcon;
    }
  };

  const getTitle = () => {
    switch (type) {
      case "expired":
        return "Invitation Expired";
      case "wrong_email":
        return "Wrong Account";
      case "invalid":
        return "Invalid Invitation";
      default:
        return "Something Went Wrong";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <HugeiconsIcon
              icon={getIcon()}
              className="size-8 text-destructive"
            />
          </div>
          <CardTitle className="text-xl">{getTitle()}</CardTitle>
          <CardDescription className="text-base">{error}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {type === "wrong_email" && (
            <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Invitation sent to:</span>
                <span className="font-medium">{invitedEmail}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Logged in as:</span>
                <span className="font-medium">{currentEmail}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {type === "wrong_email" && (
              <Button
                variant="outline"
                className="w-full"
                render={<Link href="/login?signout=true" />}
              >
                Sign Out & Use Different Account
              </Button>
            )}
            <Button
              className="w-full"
              render={<Link href="/" />}
            >
              <HugeiconsIcon icon={Home01Icon} className="size-4" />
              Go to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
