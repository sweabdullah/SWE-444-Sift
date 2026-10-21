import { describe, expect, it } from "vitest";
import { findPhysical } from "./check-logical.mjs";

const matches = (src, ext = ".tsx") => findPhysical(src, ext).map((f) => f.match);

describe("lint:logical", () => {
  it("rejects physical Tailwind spacing, inset and alignment utilities", () => {
    expect(
      matches(
        `<div className="ml-2 mr-4 pl-3 pr-1 left-0 right-[2px] text-left text-right -ml-1 md:pr-6" />`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "ml-2",
        "mr-4",
        "pl-3",
        "pr-1",
        "-ml-1",
        "pr-6",
        "left-0",
        "right-[2px]",
        "text-left",
        "text-right",
      ]),
    );
  });

  it("rejects physical borders, radii and floats", () => {
    expect(matches(`cn("border-l-2 rounded-r-md float-left")`)).toEqual(
      expect.arrayContaining(["border-l-2", "rounded-r-md", "float-left"]),
    );
  });

  it("allows logical utilities and ordinary words", () => {
    expect(
      matches(
        `<p className="ms-2 me-4 ps-3 pe-1 start-0 end-0 text-start text-end px-6 mx-auto">left-to-right copyright-2026</p>`,
      ),
    ).toEqual([]);
  });

  it("rejects physical CSS properties in stylesheets", () => {
    expect(
      matches(
        `.a { margin-left: 1px; padding-right: 2px; text-align: right; }\n.b {\n  left: 0;\n}`,
        ".css",
      ),
    ).toEqual(
      expect.arrayContaining(["margin-left", "padding-right", "text-align: right", "left:"]),
    );
  });

  it("allows logical CSS properties", () => {
    expect(
      matches(
        `.a { margin-inline-start: 1px; padding-inline: 2px; text-align: start; inset-inline-end: 0; }`,
        ".css",
      ),
    ).toEqual([]);
  });
});
