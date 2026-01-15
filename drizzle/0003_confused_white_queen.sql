CREATE TABLE "repository_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"repository_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"priority" text DEFAULT 'normal',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"triggers" jsonb,
	"author_type" text DEFAULT 'organization' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" text DEFAULT '1.0.0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sandboxes" ADD COLUMN "provider" text DEFAULT 'daytona';--> statement-breakpoint
ALTER TABLE "repository_skills" ADD CONSTRAINT "repository_skills_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_skills" ADD CONSTRAINT "repository_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "repositorySkills_repositoryId_idx" ON "repository_skills" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "repositorySkills_skillId_idx" ON "repository_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repositorySkills_repo_skill_uidx" ON "repository_skills" USING btree ("repository_id","skill_id");--> statement-breakpoint
CREATE INDEX "skills_organizationId_idx" ON "skills" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_slug_organizationId_uidx" ON "skills" USING btree ("slug","organization_id");