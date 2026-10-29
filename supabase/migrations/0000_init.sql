CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"name_bn" text NOT NULL,
	"name_en" text NOT NULL,
	"icon" text DEFAULT 'package' NOT NULL,
	"sort_order" smallint DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"suggested_units" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"parent_id" uuid,
	"author_id" uuid,
	"author_hash" text NOT NULL,
	"display_name" text,
	"body" text,
	"sticker_id" text,
	"district_id" integer,
	"upazila_id" integer,
	"locality" text,
	"status" text DEFAULT 'published' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"reporter_hash" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geocode_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" integer PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"parent_id" integer,
	"slug" text NOT NULL,
	"name_bn" text NOT NULL,
	"name_en" text NOT NULL,
	"lat" double precision,
	"lng" double precision
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_name" text NOT NULL,
	"product_key" text NOT NULL,
	"product_id" uuid,
	"category_id" uuid NOT NULL,
	"brand" text,
	"variant" text,
	"variant_key" text DEFAULT '' NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit" text NOT NULL,
	"package_description" text,
	"base_unit" text,
	"unit_price" numeric(14, 4),
	"condition" text,
	"note" text,
	"image_url" text,
	"image_width" integer,
	"image_height" integer,
	"contributor_id" uuid,
	"display_name" text,
	"submitter_hash" text NOT NULL,
	"purchase_date" date,
	"report_date" date NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"division_id" integer NOT NULL,
	"district_id" integer NOT NULL,
	"upazila_id" integer,
	"locality" text,
	"market_name" text,
	"lat" double precision,
	"lng" double precision,
	"location_method" text DEFAULT 'admin' NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"category_id" uuid NOT NULL,
	"name_bn" text NOT NULL,
	"name_en" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"default_unit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_reactions" (
	"report_id" uuid NOT NULL,
	"sticker_id" text NOT NULL,
	"client_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_reactions_report_id_sticker_id_client_hash_pk" PRIMARY KEY("report_id","sticker_id","client_hash")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_report_id_price_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."price_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_district_id_locations_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_upazila_id_locations_id_fk" FOREIGN KEY ("upazila_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_resolved_by_profiles_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_reports" ADD CONSTRAINT "price_reports_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_reports" ADD CONSTRAINT "price_reports_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_reports" ADD CONSTRAINT "price_reports_contributor_id_profiles_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_reports" ADD CONSTRAINT "price_reports_division_id_locations_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_reports" ADD CONSTRAINT "price_reports_district_id_locations_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_reports" ADD CONSTRAINT "price_reports_upazila_id_locations_id_fk" FOREIGN KEY ("upazila_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_reactions" ADD CONSTRAINT "report_reactions_report_id_price_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."price_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_key" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "comments_report_idx" ON "comments" USING btree ("report_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "comments_author_idx" ON "comments" USING btree ("author_hash","created_at");--> statement-breakpoint
CREATE INDEX "content_reports_status_idx" ON "content_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "content_reports_target_idx" ON "content_reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_reports_once_key" ON "content_reports" USING btree ("target_type","target_id","reporter_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_slug_key" ON "locations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "locations_parent_idx" ON "locations" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "moderation_actions_created_idx" ON "moderation_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "moderation_actions_target_idx" ON "moderation_actions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "price_reports_status_date_idx" ON "price_reports" USING btree ("status","report_date" DESC NULLS LAST,"created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "price_reports_product_idx" ON "price_reports" USING btree ("product_key","base_unit","variant_key");--> statement-breakpoint
CREATE INDEX "price_reports_category_idx" ON "price_reports" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "price_reports_district_idx" ON "price_reports" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "price_reports_upazila_idx" ON "price_reports" USING btree ("upazila_id");--> statement-breakpoint
CREATE INDEX "price_reports_geo_idx" ON "price_reports" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "price_reports_submitter_idx" ON "price_reports" USING btree ("submitter_hash","created_at");--> statement-breakpoint
CREATE INDEX "price_reports_name_trgm_idx" ON "price_reports" USING gin ("product_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "price_reports_brand_trgm_idx" ON "price_reports" USING gin ("brand" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_key" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");