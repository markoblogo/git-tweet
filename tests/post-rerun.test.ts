import { describe, expect, it } from "vitest";
import { PostStatus } from "@prisma/client";
import { isRerunnableStatus } from "@/lib/services/post-rerun";

describe("isRerunnableStatus", () => {
  it("allows rerun only for failed posts", () => {
    expect(isRerunnableStatus(PostStatus.FAILED)).toBe(true);
    expect(isRerunnableStatus(PostStatus.POSTED)).toBe(false);
    expect(isRerunnableStatus(PostStatus.SKIPPED_POLICY)).toBe(false);
  });
});
