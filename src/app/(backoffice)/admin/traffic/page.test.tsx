import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, getTrafficDashboard } = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getTrafficDashboard: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/analytics/traffic-query", async () => ({ ...(await vi.importActual<object>("@/lib/analytics/traffic-query")), getTrafficDashboard }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import TrafficPage from "./page";

describe("TrafficPage", () => {
  beforeEach(() => getCurrentUser.mockResolvedValue({ role: "OWNER" }));
  it("shows daily totals, trend, categories and articles", async () => {
    getTrafficDashboard.mockResolvedValue({ totals: { views: 1200, activeUsers: 800, sessions: 900, engagementRate: 0.65, averageEngagementSeconds: 84 }, daily: [{ date: new Date("2026-09-05"), views: 1200, activeUsers: 800 }], categories: [{ id: "c1", name: "軟體教學", views: 700, activeUsers: 500 }], posts: [{ id: "p1", title: "LINE 教學", views: 600, activeUsers: 420, engagementSeconds: 80 }], lastSync: { status: "SUCCESS", completedAt: new Date("2026-09-06"), rowCount: 20 } });
    render(await TrafficPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "流量監測" })).toBeInTheDocument();
    expect(screen.getAllByText("1,200")).toHaveLength(2);
    expect(screen.getByText("軟體教學")).toBeInTheDocument();
    expect(screen.getByText("LINE 教學")).toBeInTheDocument();
  });
});
