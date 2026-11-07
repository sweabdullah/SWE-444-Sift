import { Fragment, createElement, type ReactNode } from "react";

/**
 * Fill a message's `{name}` placeholders with React nodes instead of strings, e.g. to wrap each
 * figure in its own <bdi>. Get the raw template by calling the translator without values (it
 * leaves placeholders as they are). A placeholder with no node stays visible as `{name}`, like
 * `interpolate` in lib/i18n.ts, so a missing value is noticed rather than silently blank.
 */
export function fillTemplate(template: string, nodes: Record<string, ReactNode>): ReactNode[] {
  // split() with a capture group alternates: text, name, text, name, ..., text.
  return template.split(/\{(\w+)\}/).map((part, i) => {
    if (i % 2 === 0) return part;
    const node = Object.hasOwn(nodes, part) ? nodes[part] : `{${part}}`;
    return createElement(Fragment, { key: `${part}-${i}` }, node);
  });
}
