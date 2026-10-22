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

  it("rejects Tailwind arbitrary physical properties", () => {
    expect(
      matches(
        `<div className="[margin-left:4px] md:[left:0] [padding-right:2px] [text-align:right] [border-left-width:1px]" />`,
      ),
    ).toEqual([
      "[margin-left:4px]",
      "[left:0]",
      "[padding-right:2px]",
      "[text-align:right]",
      "[border-left-width:1px]",
    ]);
    expect(matches(`<div className="[margin-inline-start:4px] [inset-inline-end:0]" />`)).toEqual(
      [],
    );
  });

  it("rejects the Tailwind v4 important suffix (ml-4!)", () => {
    expect(matches(`<div className="ml-4! text-left!" />`)).toEqual(["ml-4", "text-left"]);
  });

  it("rejects physical keys and values in inline style objects", () => {
    expect(
      matches(
        `<div style={{ marginLeft: 8, paddingRight: 2, left: 0, textAlign: "left", float: "right", borderLeftWidth: 1 }} />`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "marginLeft:",
        "paddingRight:",
        "left:",
        'textAlign: "left"',
        'float: "right"',
        "borderLeftWidth:",
      ]),
    );
    expect(
      matches(`<div style={{ marginInlineStart: 8, insetInlineEnd: 0, textAlign: "start" }} />`),
    ).toEqual([]);
  });

  it("rejects @apply with physical utilities in CSS", () => {
    expect(matches(`.d { @apply ml-4 float-left; }`, ".css")).toEqual(["ml-4", "float-left"]);
    expect(matches(`.d { @apply ms-4 float-start; }`, ".css")).toEqual([]);
  });

  it("rejects left/right in one-line CSS rules", () => {
    expect(matches(`.b{left:0}.c{color:red;right:1px}`, ".css")).toEqual(["left:", "right:"]);
    expect(matches(`.b{inset-inline-start:0}`, ".css")).toEqual([]);
  });
});
