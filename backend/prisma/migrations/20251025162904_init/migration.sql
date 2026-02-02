-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."Plan" AS ENUM ('Free', 'Paid');

-- CreateEnum
CREATE TYPE "public"."ToolType" AS ENUM ('formula_master', 'sheet_summarizer', 'ai_workmate');

-- CreateEnum
CREATE TYPE "public"."Sender" AS ENUM ('user', 'bot');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255),
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "subscriptionStart" TIMESTAMP(3),
    "expiry" TIMESTAMP(3),
    "plan" "public"."Plan" NOT NULL DEFAULT 'Free',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "messageLimit" INTEGER NOT NULL DEFAULT 50,
    "emailLimit" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "googleId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admins" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(32) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "razorpay_order_id" VARCHAR(64) NOT NULL,
    "razorpay_payment_id" VARCHAR(64),
    "amount" INTEGER NOT NULL,
    "plan" VARCHAR(64) NOT NULL DEFAULT 'premium',
    "status" VARCHAR(32) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."razorpay_orders" (
    "id" SERIAL NOT NULL,
    "razorpay_order_id" VARCHAR(64) NOT NULL,
    "amount" INTEGER NOT NULL,
    "planId" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "razorpay_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."excel_analysis_results" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "file_name" VARCHAR(255),
    "file_size" INTEGER,
    "file_type" VARCHAR(64),
    "errors" JSONB,
    "trends" JSONB,
    "insight" TEXT,
    "chat_history" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "excel_analysis_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."aiworkmate_prompts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "prompt" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aiworkmate_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chats" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "tool_type" "public"."ToolType" NOT NULL,
    "title" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_messages" (
    "id" SERIAL NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "sender" "public"."Sender" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pdfchat" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255),
    "file_size" INTEGER,
    "file_type" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdfchat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pdfchat_messages" (
    "id" SERIAL NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "sender" "public"."Sender" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdfchat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mailchat" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailchat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mailchat_messages" (
    "id" SERIAL NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "sender" "public"."Sender" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mailchat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subjectlinechat" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjectlinechat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subjectlinechat_messages" (
    "id" SERIAL NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "sender" "public"."Sender" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subjectlinechat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tonepolisherchat" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tonepolisherchat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tonepolisherchat_messages" (
    "id" SERIAL NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "sender" "public"."Sender" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tonepolisherchat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."offer_letters" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "data" JSONB NOT NULL,
    "logo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."smart_invoices" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "businessName" VARCHAR(255) NOT NULL,
    "businessLogo" TEXT,
    "clientName" VARCHAR(255) NOT NULL,
    "clientEmail" VARCHAR(255),
    "businessAddress" VARCHAR(255),
    "clientAddress" VARCHAR(255),
    "clientPhoneNumber" VARCHAR(255),
    "businessEmail" VARCHAR(255),
    "businessPhoneNumber" VARCHAR(255),
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_items" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "itemName" VARCHAR(255) NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "taxPercentage" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."socialmedia_caption_chat" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "industry" VARCHAR(100),
    "tone" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "socialmedia_caption_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."socialmedia_caption_chat_messages" (
    "id" SERIAL NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "sender" "public"."Sender" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "socialmedia_caption_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hashtag_strategist_chat" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "industry" VARCHAR(100),
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hashtag_strategist_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hashtag_strategist_chat_messages" (
    "id" SERIAL NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "sender" "public"."Sender" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hashtag_strategist_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ad_caption_chat" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "objective" VARCHAR(100),
    "product" VARCHAR(255),
    "tone" VARCHAR(50),
    "audience" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_caption_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ad_caption_chat_messages" (
    "id" SERIAL NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "sender" "public"."Sender" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_caption_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."caption_rewriter_chat" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caption_rewriter_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."caption_rewriter_chat_messages" (
    "id" SERIAL NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "sender" "public"."Sender" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caption_rewriter_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."smartdataextractor_session" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255),
    "file_size" INTEGER,
    "file_type" VARCHAR(64),
    "pdfText" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smartdataextractor_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."smartdataextractor_message" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "sender" "public"."Sender" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "smartdataextractor_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mailmergeaichat" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailmergeaichat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mailmergeaichat_messages" (
    "id" SERIAL NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "sender" "public"."Sender" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mailmergeaichat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mail_templates" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255),
    "description" VARCHAR(1024),
    "body" TEXT NOT NULL,
    "category" VARCHAR(100),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mail_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "public"."users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "public"."admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_order_id_key" ON "public"."payments"("razorpay_order_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "public"."payments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "razorpay_orders_razorpay_order_id_key" ON "public"."razorpay_orders"("razorpay_order_id");

-- CreateIndex
CREATE INDEX "excel_analysis_results_user_id_idx" ON "public"."excel_analysis_results"("user_id");

-- CreateIndex
CREATE INDEX "aiworkmate_prompts_user_id_idx" ON "public"."aiworkmate_prompts"("user_id");

-- CreateIndex
CREATE INDEX "chats_user_id_idx" ON "public"."chats"("user_id");

-- CreateIndex
CREATE INDEX "chat_messages_chat_id_idx" ON "public"."chat_messages"("chat_id");

-- CreateIndex
CREATE INDEX "pdfchat_user_id_idx" ON "public"."pdfchat"("user_id");

-- CreateIndex
CREATE INDEX "pdfchat_messages_chat_id_idx" ON "public"."pdfchat_messages"("chat_id");

-- CreateIndex
CREATE INDEX "mailchat_user_id_idx" ON "public"."mailchat"("user_id");

-- CreateIndex
CREATE INDEX "mailchat_messages_chat_id_idx" ON "public"."mailchat_messages"("chat_id");

-- CreateIndex
CREATE INDEX "subjectlinechat_user_id_idx" ON "public"."subjectlinechat"("user_id");

-- CreateIndex
CREATE INDEX "subjectlinechat_messages_chat_id_idx" ON "public"."subjectlinechat_messages"("chat_id");

-- CreateIndex
CREATE INDEX "tonepolisherchat_user_id_idx" ON "public"."tonepolisherchat"("user_id");

-- CreateIndex
CREATE INDEX "tonepolisherchat_messages_chat_id_idx" ON "public"."tonepolisherchat_messages"("chat_id");

-- CreateIndex
CREATE INDEX "offer_letters_user_id_idx" ON "public"."offer_letters"("user_id");

-- CreateIndex
CREATE INDEX "smart_invoices_user_id_idx" ON "public"."smart_invoices"("user_id");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "public"."invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "socialmedia_caption_chat_user_id_idx" ON "public"."socialmedia_caption_chat"("user_id");

-- CreateIndex
CREATE INDEX "socialmedia_caption_chat_messages_chat_id_idx" ON "public"."socialmedia_caption_chat_messages"("chat_id");

-- CreateIndex
CREATE INDEX "hashtag_strategist_chat_user_id_idx" ON "public"."hashtag_strategist_chat"("user_id");

-- CreateIndex
CREATE INDEX "hashtag_strategist_chat_messages_chat_id_idx" ON "public"."hashtag_strategist_chat_messages"("chat_id");

-- CreateIndex
CREATE INDEX "ad_caption_chat_user_id_idx" ON "public"."ad_caption_chat"("user_id");

-- CreateIndex
CREATE INDEX "ad_caption_chat_messages_chat_id_idx" ON "public"."ad_caption_chat_messages"("chat_id");

-- CreateIndex
CREATE INDEX "caption_rewriter_chat_user_id_idx" ON "public"."caption_rewriter_chat"("user_id");

-- CreateIndex
CREATE INDEX "caption_rewriter_chat_messages_chat_id_idx" ON "public"."caption_rewriter_chat_messages"("chat_id");

-- CreateIndex
CREATE INDEX "smartdataextractor_session_user_id_idx" ON "public"."smartdataextractor_session"("user_id");

-- CreateIndex
CREATE INDEX "smartdataextractor_message_session_id_idx" ON "public"."smartdataextractor_message"("session_id");

-- CreateIndex
CREATE INDEX "mailmergeaichat_user_id_idx" ON "public"."mailmergeaichat"("user_id");

-- CreateIndex
CREATE INDEX "mailmergeaichat_messages_chat_id_idx" ON "public"."mailmergeaichat_messages"("chat_id");

-- CreateIndex
CREATE INDEX "mail_templates_user_id_idx" ON "public"."mail_templates"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mail_templates_userId_title_key" ON "public"."mail_templates"("user_id", "title");

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."excel_analysis_results" ADD CONSTRAINT "excel_analysis_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."aiworkmate_prompts" ADD CONSTRAINT "aiworkmate_prompts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chats" ADD CONSTRAINT "chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pdfchat" ADD CONSTRAINT "pdfchat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pdfchat_messages" ADD CONSTRAINT "pdfchat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."pdfchat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mailchat" ADD CONSTRAINT "mailchat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mailchat_messages" ADD CONSTRAINT "mailchat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."mailchat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subjectlinechat" ADD CONSTRAINT "subjectlinechat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subjectlinechat_messages" ADD CONSTRAINT "subjectlinechat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."subjectlinechat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tonepolisherchat" ADD CONSTRAINT "tonepolisherchat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tonepolisherchat_messages" ADD CONSTRAINT "tonepolisherchat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."tonepolisherchat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."offer_letters" ADD CONSTRAINT "offer_letters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."smart_invoices" ADD CONSTRAINT "smart_invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."smart_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."socialmedia_caption_chat" ADD CONSTRAINT "socialmedia_caption_chat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."socialmedia_caption_chat_messages" ADD CONSTRAINT "socialmedia_caption_chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."socialmedia_caption_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hashtag_strategist_chat" ADD CONSTRAINT "hashtag_strategist_chat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hashtag_strategist_chat_messages" ADD CONSTRAINT "hashtag_strategist_chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."hashtag_strategist_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ad_caption_chat" ADD CONSTRAINT "ad_caption_chat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ad_caption_chat_messages" ADD CONSTRAINT "ad_caption_chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."ad_caption_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."caption_rewriter_chat" ADD CONSTRAINT "caption_rewriter_chat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."caption_rewriter_chat_messages" ADD CONSTRAINT "caption_rewriter_chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."caption_rewriter_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."smartdataextractor_session" ADD CONSTRAINT "smartdataextractor_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."smartdataextractor_message" ADD CONSTRAINT "smartdataextractor_message_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."smartdataextractor_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mailmergeaichat" ADD CONSTRAINT "mailmergeaichat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mailmergeaichat_messages" ADD CONSTRAINT "mailmergeaichat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."mailmergeaichat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mail_templates" ADD CONSTRAINT "mail_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
