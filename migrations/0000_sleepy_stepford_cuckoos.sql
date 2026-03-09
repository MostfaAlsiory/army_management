CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"soldier_id" integer NOT NULL,
	"date" date NOT NULL,
	"status" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soldiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"military_id" varchar NOT NULL,
	"full_name" varchar NOT NULL,
	"birth_date" date NOT NULL,
	"birth_place" varchar NOT NULL,
	"national_id" varchar NOT NULL,
	"rank" varchar NOT NULL,
	"specialization" varchar NOT NULL,
	"unit" varchar NOT NULL,
	"battalion" varchar NOT NULL,
	"join_date" date NOT NULL,
	"admin_status" varchar NOT NULL,
	"health_status" varchar NOT NULL,
	"marital_status" varchar NOT NULL,
	"phone_number" varchar NOT NULL,
	"address" text NOT NULL,
	"closest_relative" varchar NOT NULL,
	"photo_path" text,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "soldiers_military_id_unique" UNIQUE("military_id"),
	CONSTRAINT "soldiers_national_id_unique" UNIQUE("national_id")
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_soldier_id_soldiers_id_fk" FOREIGN KEY ("soldier_id") REFERENCES "public"."soldiers"("id") ON DELETE no action ON UPDATE no action;