CREATE TABLE "git_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"provider_username" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"scopes" text,
	"connected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "git_connections" ADD CONSTRAINT "git_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gitConnections_userId_idx" ON "git_connections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gitConnections_userId_provider_uidx" ON "git_connections" USING btree ("user_id","provider");