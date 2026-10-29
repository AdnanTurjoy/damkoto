CREATE TABLE "official_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"source" text NOT NULL,
	"item_bn" text NOT NULL,
	"item_en" text NOT NULL,
	"product_id" uuid,
	"price_min" numeric(12, 2) NOT NULL,
	"price_max" numeric(12, 2),
	"quantity" numeric(12, 3) DEFAULT '1' NOT NULL,
	"unit" text NOT NULL,
	"unit_label" text,
	"base_unit" text,
	"unit_min" numeric(14, 4),
	"unit_max" numeric(14, 4),
	"area" text NOT NULL,
	"effective_date" date NOT NULL,
	"source_url" text,
	"note" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "official_prices" ADD CONSTRAINT "official_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_prices" ADD CONSTRAINT "official_prices_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "official_prices_category_idx" ON "official_prices" USING btree ("category","effective_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "official_prices_product_idx" ON "official_prices" USING btree ("product_id","effective_date" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "official_prices_entry_key" ON "official_prices" USING btree ("source","item_en","area","effective_date");