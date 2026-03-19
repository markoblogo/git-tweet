import { describe, expect, it } from "vitest";
import { PostDestination, PostStatus } from "@prisma/client";
import { isRerunnableDestination, isRerunnableStatus } from "@/lib/services/post-rerun";

describe("isRerunnableStatus", () => {
  it("allows rerun for failed and posted social posts", () => {
    expect(isRerunnableStatus(PostStatus.FAILED)).toBe(true);
    expect(isRerunnableStatus(PostStatus.POSTED)).toBe(true);
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
