-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'salesperson',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "grape_varieties" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "language_origin" TEXT NOT NULL DEFAULT 'en',
    "phonetic_ipa" TEXT,
    "phonetic_simple" TEXT,
    "ssml_pronunciation" TEXT,
    "alternate_hearings" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "regions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "parent_region_id" INTEGER,
    "language_origin" TEXT NOT NULL DEFAULT 'en',
    "phonetic_ipa" TEXT,
    "phonetic_simple" TEXT,
    "ssml_pronunciation" TEXT,
    "alternate_hearings" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "regions_parent_region_id_fkey" FOREIGN KEY ("parent_region_id") REFERENCES "regions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "producers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "region_id" INTEGER,
    "language_origin" TEXT NOT NULL DEFAULT 'en',
    "phonetic_ipa" TEXT,
    "phonetic_simple" TEXT,
    "ssml_pronunciation" TEXT,
    "alternate_hearings" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "producers_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wines" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "vintage" INTEGER,
    "grape_variety_id" INTEGER,
    "region_id" INTEGER,
    "producer_id" INTEGER,
    "appellation" TEXT,
    "sku" TEXT,
    "description" TEXT,
    "price_wholesale" REAL NOT NULL,
    "price_retail" REAL,
    "bottle_size" TEXT NOT NULL DEFAULT '750ml',
    "case_size" INTEGER NOT NULL DEFAULT 12,
    "language_origin" TEXT NOT NULL DEFAULT 'en',
    "phonetic_ipa" TEXT,
    "phonetic_simple" TEXT,
    "ssml_pronunciation" TEXT,
    "alternate_hearings" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "wines_grape_variety_id_fkey" FOREIGN KEY ("grape_variety_id") REFERENCES "grape_varieties" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "wines_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "wines_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "wine_id" INTEGER NOT NULL,
    "quantity_available" INTEGER NOT NULL DEFAULT 0,
    "quantity_reserved" INTEGER NOT NULL DEFAULT 0,
    "warehouse_location" TEXT,
    "reorder_point" INTEGER NOT NULL DEFAULT 0,
    "last_updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_wine_id_fkey" FOREIGN KEY ("wine_id") REFERENCES "wines" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "account_type" TEXT NOT NULL DEFAULT 'restaurant',
    "salesperson_id" INTEGER,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "accounts_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "account_id" INTEGER NOT NULL,
    "salesperson_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "order_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_date" DATETIME,
    "total" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "voice_transcript" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "orders_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "wine_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_type" TEXT NOT NULL DEFAULT 'bottle',
    "unit_price" REAL NOT NULL,
    "line_total" REAL NOT NULL,
    CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_items_wine_id_fkey" FOREIGN KEY ("wine_id") REFERENCES "wines" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "tracking_number" TEXT,
    "carrier" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "shipped_date" DATETIME,
    "estimated_delivery" DATETIME,
    "delivered_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "salesperson_id" INTEGER NOT NULL,
    "account_id" INTEGER,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "scheduled_at" DATETIME NOT NULL,
    "reminder_at" DATETIME,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "appointments_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pronunciation_dictionary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "term" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "phonetic_ipa" TEXT,
    "phonetic_simple" TEXT,
    "ssml_pronunciation" TEXT,
    "alternate_hearings" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "query_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "query_text" TEXT NOT NULL,
    "query_type" TEXT NOT NULL DEFAULT 'text',
    "intent_parsed" TEXT,
    "response_text" TEXT,
    "successful" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "query_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "grape_varieties_name_key" ON "grape_varieties"("name");

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_country_key" ON "regions"("name", "country");

-- CreateIndex
CREATE UNIQUE INDEX "wines_sku_key" ON "wines"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_wine_id_key" ON "inventory"("wine_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "pronunciation_dictionary_term_category_key" ON "pronunciation_dictionary"("term", "category");
