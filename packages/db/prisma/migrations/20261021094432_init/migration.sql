-- CreateEnum
CREATE TYPE "locale" AS ENUM ('ar', 'en');

-- CreateEnum
CREATE TYPE "card_status" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "reward_type" AS ENUM ('cashback', 'points', 'miles', 'none');

-- CreateEnum
CREATE TYPE "card_network" AS ENUM ('visa', 'mastercard', 'amex', 'mada', 'unionpay');

-- CreateEnum
CREATE TYPE "spending_category" AS ENUM ('general', 'dining', 'groceries', 'fuel', 'travel', 'airlines', 'hotels', 'online', 'international', 'entertainment', 'shopping', 'utilities', 'education', 'healthcare', 'other');

-- CreateEnum
CREATE TYPE "rate_unit" AS ENUM ('percent', 'points_per_sar', 'miles_per_sar');

-- CreateEnum
CREATE TYPE "cap_period" AS ENUM ('per_transaction', 'monthly', 'quarterly', 'yearly');

-- CreateEnum
CREATE TYPE "source_type" AS ENUM ('html', 'pdf');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "pending_request_kind" AS ENUM ('new_card', 'field_change', 'withdrawal');

-- CreateEnum
CREATE TYPE "pending_request_status" AS ENUM ('pending', 'approved', 'rejected', 'failed_validation');

-- CreateEnum
CREATE TYPE "crawl_run_status" AS ENUM ('running', 'succeeded', 'failed', 'aborted_guard');

-- CreateEnum
CREATE TYPE "crawl_trigger" AS ENUM ('manual', 'scheduled');

-- CreateTable
CREATE TABLE "bank" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "homepage_url" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_entry_url" (
    "id" TEXT NOT NULL,
    "bank_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_entry_url_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source" (
    "id" TEXT NOT NULL,
    "bank_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source_type" "source_type" NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "content_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card" (
    "id" TEXT NOT NULL,
    "bank_id" TEXT NOT NULL,
    "canonical_url" TEXT NOT NULL,
    "normalised_name" TEXT NOT NULL,
    "status" "card_status" NOT NULL DEFAULT 'draft',
    "reward_type" "reward_type" NOT NULL,
    "network" "card_network",
    "sharia_compliant" BOOLEAN,
    "min_monthly_income" DECIMAL(12,2),
    "source_id" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3),
    "consecutive_absences" INTEGER NOT NULL DEFAULT 0,
    "last_seen_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee" (
    "card_id" TEXT NOT NULL,
    "annual_fee" DECIMAL(12,2),
    "issuance_fee" DECIMAL(12,2),
    "supplementary_card_fee" DECIMAL(12,2),
    "fx_markup_pct" DECIMAL(6,3),
    "cash_advance_fee" DECIMAL(12,2),
    "late_payment_fee" DECIMAL(12,2),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_pkey" PRIMARY KEY ("card_id")
);

-- CreateTable
CREATE TABLE "card_translation" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "name" TEXT NOT NULL,
    "benefits_description" TEXT,
    "reward_conditions" TEXT,
    "eligibility" TEXT,
    "fee_waiver_condition" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_field_source" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,

    CONSTRAINT "card_field_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_tier" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "reward_type" "reward_type" NOT NULL,
    "spending_category" "spending_category" NOT NULL,
    "rate" DECIMAL(10,4) NOT NULL,
    "rate_unit" "rate_unit" NOT NULL,
    "cap" DECIMAL(12,2),
    "cap_period" "cap_period",
    "min_spend" DECIMAL(12,2),
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_tier_translation" (
    "id" TEXT NOT NULL,
    "reward_tier_id" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "condition" TEXT NOT NULL,

    CONSTRAINT "reward_tier_translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "password_hash" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'user',
    "locale" "locale" NOT NULL DEFAULT 'ar',
    "digest_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribe_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_token" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "shortlist" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_run" (
    "id" TEXT NOT NULL,
    "bank_id" TEXT NOT NULL,
    "trigger" "crawl_trigger" NOT NULL,
    "status" "crawl_run_status" NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "pages_fetched" INTEGER NOT NULL DEFAULT 0,
    "cards_found" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "crawl_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_request" (
    "id" TEXT NOT NULL,
    "kind" "pending_request_kind" NOT NULL,
    "status" "pending_request_status" NOT NULL DEFAULT 'pending',
    "bank_id" TEXT NOT NULL,
    "card_id" TEXT,
    "crawl_run_id" TEXT,
    "source_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "validation_errors" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,

    CONSTRAINT "pending_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_change" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "pending_request_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "locale" "locale",
    "old_value" JSONB,
    "new_value" JSONB,
    "approved_at" TIMESTAMP(3) NOT NULL,
    "notified_at" TIMESTAMP(3),

    CONSTRAINT "card_change_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_slug_key" ON "bank"("slug");

-- CreateIndex
CREATE INDEX "bank_active_idx" ON "bank"("active");

-- CreateIndex
CREATE UNIQUE INDEX "bank_entry_url_bank_id_url_key" ON "bank_entry_url"("bank_id", "url");

-- CreateIndex
CREATE INDEX "source_bank_id_url_idx" ON "source"("bank_id", "url");

-- CreateIndex
CREATE INDEX "card_bank_id_normalised_name_idx" ON "card"("bank_id", "normalised_name");

-- CreateIndex
CREATE INDEX "card_status_idx" ON "card"("status");

-- CreateIndex
CREATE INDEX "card_status_reward_type_idx" ON "card"("status", "reward_type");

-- CreateIndex
CREATE INDEX "card_status_bank_id_idx" ON "card"("status", "bank_id");

-- CreateIndex
CREATE INDEX "card_status_sharia_compliant_idx" ON "card"("status", "sharia_compliant");

-- CreateIndex
CREATE INDEX "card_status_min_monthly_income_idx" ON "card"("status", "min_monthly_income");

-- CreateIndex
CREATE INDEX "card_network_idx" ON "card"("network");

-- CreateIndex
CREATE UNIQUE INDEX "card_bank_id_canonical_url_key" ON "card"("bank_id", "canonical_url");

-- CreateIndex
CREATE INDEX "fee_annual_fee_idx" ON "fee"("annual_fee");

-- CreateIndex
CREATE UNIQUE INDEX "card_translation_card_id_locale_key" ON "card_translation"("card_id", "locale");

-- CreateIndex
CREATE INDEX "card_field_source_source_id_idx" ON "card_field_source"("source_id");

-- CreateIndex
CREATE UNIQUE INDEX "card_field_source_card_id_field_name_key" ON "card_field_source"("card_id", "field_name");

-- CreateIndex
CREATE INDEX "reward_tier_spending_category_rate_idx" ON "reward_tier"("spending_category", "rate");

-- CreateIndex
CREATE INDEX "reward_tier_reward_type_rate_idx" ON "reward_tier"("reward_type", "rate");

-- CreateIndex
CREATE UNIQUE INDEX "reward_tier_card_id_sort_order_key" ON "reward_tier"("card_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "reward_tier_translation_reward_tier_id_locale_key" ON "reward_tier_translation"("reward_tier_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_unsubscribe_token_key" ON "user"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE INDEX "account_user_id_idx" ON "account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_provider_provider_account_id_key" ON "account"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_session_token_key" ON "session"("session_token");

-- CreateIndex
CREATE INDEX "session_user_id_idx" ON "session"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_identifier_token_key" ON "verification_token"("identifier", "token");

-- CreateIndex
CREATE INDEX "shortlist_card_id_idx" ON "shortlist"("card_id");

-- CreateIndex
CREATE UNIQUE INDEX "shortlist_user_id_card_id_key" ON "shortlist"("user_id", "card_id");

-- CreateIndex
CREATE INDEX "crawl_run_bank_id_started_at_idx" ON "crawl_run"("bank_id", "started_at");

-- CreateIndex
CREATE INDEX "crawl_run_status_idx" ON "crawl_run"("status");

-- CreateIndex
CREATE INDEX "pending_request_status_created_at_idx" ON "pending_request"("status", "created_at");

-- CreateIndex
CREATE INDEX "pending_request_bank_id_idx" ON "pending_request"("bank_id");

-- CreateIndex
CREATE INDEX "pending_request_card_id_idx" ON "pending_request"("card_id");

-- CreateIndex
CREATE INDEX "pending_request_crawl_run_id_idx" ON "pending_request"("crawl_run_id");

-- CreateIndex
CREATE INDEX "card_change_card_id_approved_at_idx" ON "card_change"("card_id", "approved_at");

-- CreateIndex
CREATE INDEX "card_change_pending_request_id_idx" ON "card_change"("pending_request_id");

-- CreateIndex
CREATE INDEX "card_change_notified_at_idx" ON "card_change"("notified_at");

-- AddForeignKey
ALTER TABLE "bank_entry_url" ADD CONSTRAINT "bank_entry_url_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "bank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source" ADD CONSTRAINT "source_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card" ADD CONSTRAINT "card_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card" ADD CONSTRAINT "card_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee" ADD CONSTRAINT "fee_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_translation" ADD CONSTRAINT "card_translation_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_field_source" ADD CONSTRAINT "card_field_source_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_field_source" ADD CONSTRAINT "card_field_source_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_tier" ADD CONSTRAINT "reward_tier_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_tier_translation" ADD CONSTRAINT "reward_tier_translation_reward_tier_id_fkey" FOREIGN KEY ("reward_tier_id") REFERENCES "reward_tier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist" ADD CONSTRAINT "shortlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist" ADD CONSTRAINT "shortlist_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_run" ADD CONSTRAINT "crawl_run_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_request" ADD CONSTRAINT "pending_request_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_request" ADD CONSTRAINT "pending_request_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_request" ADD CONSTRAINT "pending_request_crawl_run_id_fkey" FOREIGN KEY ("crawl_run_id") REFERENCES "crawl_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_request" ADD CONSTRAINT "pending_request_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_request" ADD CONSTRAINT "pending_request_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_change" ADD CONSTRAINT "card_change_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_change" ADD CONSTRAINT "card_change_pending_request_id_fkey" FOREIGN KEY ("pending_request_id") REFERENCES "pending_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
