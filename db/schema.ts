import { pgTable, serial, text, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employees = pgTable("employees", {
  id: serial().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  phone: text().notNull(),
  department: text().notNull(),
  designation: text().notNull(),
  salary: numeric({ mode: "number" }).notNull(),
  joiningDate: date("joining_date").notNull(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Holds an auto-generated JWT signing secret when JWT_SECRET is not configured.
export const appSettings = pgTable("app_settings", {
  key: text().primaryKey(),
  value: text().notNull(),
});
