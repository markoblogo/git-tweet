import { describe, expect, it } from "vitest";
import { PostDestination, PostStatus } from "@prisma/client";
import { isRerunnableDestination, isRerunnableStatus } from "@/lib/services/post-rerun";

describe("isRerunnableStatus", () => {
  it("allows rerun only for failed posts", () => {
    expect(isRerunnableStatus(PostStatus.FAILED)).toBe(true);
    expect(isRerunnableStatus(PostStatus.POSTED)).toBe(false);
    expect(isRerunnableStatus(PostStatus.SKIPPED_POLICY)).toBe(false);
  });
});

describe("isRerunnableDestination", () => {
  it("allows rerun only for social destinations", () => {
    expect(isRerunnableDestination(PostDestination.X)).toBe(true);
    expect(isRerunnableDestination(PostDestination.BLUESKY)).toBe(true);
    expect(isRerunnableDestination(PostDestination.SYSTEM)).toBe(false);
  });
});
