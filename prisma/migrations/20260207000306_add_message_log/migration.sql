-- CreateTable
CREATE TABLE "message_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient_to" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "template_key" TEXT,
    "related_type" TEXT,
    "related_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "external_id" TEXT,
    "error_detail" TEXT,
    "sent_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
