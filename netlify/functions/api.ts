import type { Config } from "@netlify/functions";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { and, desc, eq, ilike, ne, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appSettings, employees, users } from "../../db/schema.js";

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

const EMAIL_RX = /^\S+@\S+\.\S+$/;
const PHONE_RX = /^[0-9+\-\s]{7,15}$/;

let cachedSecret: string | null = null;
async function getJwtSecret(): Promise<string> {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (cachedSecret) return cachedSecret;
  await db
    .insert(appSettings)
    .values({ key: "jwt_secret", value: randomBytes(48).toString("hex") })
    .onConflictDoNothing();
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "jwt_secret"));
  cachedSecret = row.value;
  return cachedSecret;
}

async function issueToken(user: { id: number; name: string; email: string }) {
  const token = jwt.sign({ id: user.id }, await getJwtSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"],
  });
  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

async function requireUser(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Not authorized, token missing");
  let id: number;
  try {
    id = (jwt.verify(token, await getJwtSecret()) as { id: number }).id;
  } catch {
    throw new HttpError(401, "Not authorized, token invalid or expired");
  }
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, id));
  if (!user) throw new HttpError(401, "Not authorized, user no longer exists");
  return user;
}

async function readBody(req: Request): Promise<Record<string, any>> {
  try {
    return (await req.json()) ?? {};
  } catch {
    return {};
  }
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

function validateEmployee(body: Record<string, any>) {
  const values = {
    name: str(body.name),
    email: str(body.email).toLowerCase(),
    phone: str(body.phone),
    department: str(body.department),
    designation: str(body.designation),
    salary: Number(body.salary),
    joiningDate: str(body.joiningDate).slice(0, 10),
  };
  const errors: string[] = [];
  if (!values.name) errors.push("Name is required");
  if (!values.email) errors.push("Email is required");
  else if (!EMAIL_RX.test(values.email)) errors.push("Enter a valid email address");
  if (!values.phone) errors.push("Phone is required");
  else if (!PHONE_RX.test(values.phone)) errors.push("Enter a valid phone number");
  if (!values.department) errors.push("Department is required");
  if (!values.designation) errors.push("Designation is required");
  if (body.salary === undefined || body.salary === "" || Number.isNaN(values.salary)) errors.push("Salary is required");
  else if (values.salary < 0) errors.push("Salary cannot be negative");
  if (!values.joiningDate || Number.isNaN(Date.parse(values.joiningDate))) errors.push("Joining date is required");
  if (errors.length) throw new HttpError(400, errors.join(", "));
  return values;
}

// Keep the response shape the React frontend already expects (Mongo-style `_id`).
const toApi = (e: typeof employees.$inferSelect) => ({ _id: String(e.id), ...e, id: undefined });

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Invalid ID format");
  return id;
}

async function ensureEmployeeEmailFree(email: string, exceptId?: number) {
  const cond = exceptId ? and(eq(employees.email, email), ne(employees.id, exceptId)) : eq(employees.email, email);
  const [existing] = await db.select({ id: employees.id }).from(employees).where(cond);
  if (existing) throw new HttpError(409, "An entry with this email already exists");
}

async function route(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const method = req.method;

  // ---- Auth ----
  if (parts[0] === "auth") {
    if (parts[1] === "register" && method === "POST") {
      const body = await readBody(req);
      const name = str(body.name);
      const email = str(body.email).toLowerCase();
      const password = typeof body.password === "string" ? body.password : "";
      if (!name || !email || !password) throw new HttpError(400, "Name, email and password are required");
      if (!EMAIL_RX.test(email)) throw new HttpError(400, "Enter a valid email address");
      if (password.length < 6) throw new HttpError(400, "Password must be at least 6 characters");
      const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (exists) throw new HttpError(409, "An account with this email already exists");
      const passwordHash = await bcrypt.hash(password, 10);
      const [user] = await db.insert(users).values({ name, email, passwordHash }).returning();
      return json(await issueToken(user), 201);
    }
    if (parts[1] === "login" && method === "POST") {
      const body = await readBody(req);
      const email = str(body.email).toLowerCase();
      const password = typeof body.password === "string" ? body.password : "";
      if (!email || !password) throw new HttpError(400, "Email and password are required");
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new HttpError(401, "Incorrect email or password");
      }
      return json(await issueToken(user));
    }
    if (parts[1] === "me" && method === "GET") {
      const user = await requireUser(req);
      return json({ user });
    }
  }

  // ---- Employees ----
  if (parts[0] === "employees" && parts.length <= 2) {
    const user = await requireUser(req);

    if (parts.length === 1) {
      if (method === "GET") {
        const search = (url.searchParams.get("search") || "").trim();
        const rx = `%${search.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
        const rows = await db
          .select()
          .from(employees)
          .where(
            search
              ? or(
                  ilike(employees.name, rx),
                  ilike(employees.email, rx),
                  ilike(employees.department, rx),
                  ilike(employees.designation, rx),
                )
              : undefined,
          )
          .orderBy(desc(employees.createdAt), desc(employees.id));
        return json(rows.map(toApi));
      }
      if (method === "POST") {
        const values = validateEmployee(await readBody(req));
        await ensureEmployeeEmailFree(values.email);
        const [row] = await db.insert(employees).values({ ...values, createdBy: user.id }).returning();
        return json(toApi(row), 201);
      }
    } else {
      const id = parseId(parts[1]);
      if (method === "GET") {
        const [row] = await db.select().from(employees).where(eq(employees.id, id));
        if (!row) throw new HttpError(404, "Employee not found");
        return json(toApi(row));
      }
      if (method === "PUT") {
        const values = validateEmployee(await readBody(req));
        await ensureEmployeeEmailFree(values.email, id);
        const [row] = await db
          .update(employees)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(employees.id, id))
          .returning();
        if (!row) throw new HttpError(404, "Employee not found");
        return json(toApi(row));
      }
      if (method === "DELETE") {
        const [row] = await db.delete(employees).where(eq(employees.id, id)).returning();
        if (!row) throw new HttpError(404, "Employee not found");
        return json({ message: "Employee deleted", id: String(row.id) });
      }
    }
  }

  throw new HttpError(404, `Route not found: ${url.pathname}`);
}

export default async (req: Request) => {
  try {
    return await route(req);
  } catch (err: any) {
    if (err instanceof HttpError) return json({ message: err.message }, err.status);
    // Unique-constraint race (e.g. two requests with the same email)
    if (err?.code === "23505" || err?.cause?.code === "23505") {
      return json({ message: "An entry with this email already exists" }, 409);
    }
    console.error(err);
    return json({ message: "Server error" }, 500);
  }
};

export const config: Config = {
  path: ["/api/*"],
};
