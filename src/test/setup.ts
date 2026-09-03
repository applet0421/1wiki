import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

process.env.DATABASE_URL ||= "postgresql://postgres:postgres@127.0.0.1:55432/onewiki_test";
process.env.DIRECT_URL ||= process.env.DATABASE_URL;
process.env.AUTH_SESSION_SECRET ||= "test-session-secret-with-at-least-32-characters";
