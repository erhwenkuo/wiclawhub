import { describe, it, expect } from "vitest";
import { timeAgo, formatNumber, formatDate } from "@/lib/format";

describe("timeAgo", () => {
  it("returns 'just now' for recent timestamps", () => {
    const now = Date.now() / 1000;
    expect(timeAgo(now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = Date.now() / 1000 - 300;
    expect(timeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = Date.now() / 1000 - 7200;
    expect(timeAgo(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const threeDaysAgo = Date.now() / 1000 - 86400 * 3;
    expect(timeAgo(threeDaysAgo)).toBe("3d ago");
  });

  it("returns months ago", () => {
    const twoMonthsAgo = Date.now() / 1000 - 86400 * 65;
    expect(timeAgo(twoMonthsAgo)).toBe("2mo ago");
  });

  it("returns years ago", () => {
    const twoYearsAgo = Date.now() / 1000 - 86400 * 400;
    expect(timeAgo(twoYearsAgo)).toBe("1y ago");
  });
});

describe("formatNumber", () => {
  it("returns plain number for small values", () => {
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
  });

  it("formats thousands with K suffix", () => {
    expect(formatNumber(1000)).toBe("1.0K");
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(999999)).toBe("1000.0K");
  });

  it("formats millions with M suffix", () => {
    expect(formatNumber(1_000_000)).toBe("1.0M");
    expect(formatNumber(2_500_000)).toBe("2.5M");
  });
});

describe("formatDate", () => {
  it("formats unix timestamp to readable date", () => {
    // 2024-01-15 UTC
    const ts = 1705276800;
    const result = formatDate(ts);
    expect(result).toContain("Jan");
    expect(result).toContain("2024");
    expect(result).toContain("15");
  });
});
