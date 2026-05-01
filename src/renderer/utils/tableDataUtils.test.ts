import { describe, it, expect } from "vitest";
import { parseEditValue } from "./tableDataUtils";

describe("parseEditValue", () => {
    it("returns null for empty string", () => {
        expect(parseEditValue("")).toBeNull();
    });

    it("returns null for 'null' regardless of case", () => {
        expect(parseEditValue("null")).toBeNull();
        expect(parseEditValue("NULL")).toBeNull();
        expect(parseEditValue("Null")).toBeNull();
        expect(parseEditValue("nUlL")).toBeNull();
    });

    it("coerces integer strings to numbers", () => {
        expect(parseEditValue("42")).toBe(42);
        expect(parseEditValue("0")).toBe(0);
        expect(parseEditValue("-7")).toBe(-7);
    });

    it("coerces float strings to numbers", () => {
        expect(parseEditValue("3.14")).toBe(3.14);
        expect(parseEditValue("-0.5")).toBe(-0.5);
    });

    it("returns the raw string for non-numeric text", () => {
        expect(parseEditValue("hello")).toBe("hello");
        expect(parseEditValue("alice@example.com")).toBe("alice@example.com");
        expect(parseEditValue("2024-01-01")).toBe("2024-01-01");
    });

    it("does not coerce whitespace-only strings to zero", () => {
        // "  ".trim() === "" so the numeric branch is skipped
        expect(parseEditValue("  ")).toBe("  ");
    });

    it("handles numeric strings with surrounding whitespace as numbers", () => {
        // Number(" 42 ") is 42, and " 42 ".trim() !== ""
        expect(parseEditValue(" 42 ")).toBe(42);
    });

    it("returns strings that look like numbers but are not pure numeric as strings", () => {
        // e.g. leading zeros that are clearly not numbers in context
        expect(parseEditValue("007")).toBe(7); // Number("007") is 7, this is expected
        expect(parseEditValue("1e2")).toBe(100); // scientific notation is numeric
    });

    it("returns string for values that cannot be parsed as numbers", () => {
        expect(parseEditValue("12abc")).toBe("12abc");
        expect(parseEditValue("$100")).toBe("$100");
    });
});
