import type { Metadata } from "next";
import { readFileSync } from "fs";
import path from "path";

export const metadata: Metadata = {
    title: "Changelog — DB Assistant",
    description: "Release notes and changelog for DB Assistant.",
};

function getChangelog(): string {
    try {
        const filePath = path.join(process.cwd(), "..", "CHANGELOG.md");
        return readFileSync(filePath, "utf-8");
    } catch {
        return "# Changelog\n\nChangelog is not available.";
    }
}

function parseMarkdown(md: string): string {
    return md
        .replace(/^### (.+)$/gm, '<h3 class="mt-6 mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">$1</h3>')
        .replace(/^## \[([^\]]+)\](?: - (.+))?$/gm, '<h2 class="mt-10 mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2"><span class="font-mono text-blue-600 dark:text-blue-400">$1</span><span class="ml-2 text-sm font-normal text-gray-500">$2</span></h2>')
        .replace(/^## (.+)$/gm, '<h2 class="mt-10 mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">$1</h2>')
        .replace(/^#### (.+)$/gm, '<h4 class="mt-4 mb-1 text-base font-semibold text-gray-800 dark:text-gray-200">$1</h4>')
        .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">$1</li>')
        .replace(/^# .+$/gm, "")
        .replace(/\n{3,}/g, "\n\n");
}

export default function ChangelogPage() {
    const changelog = getChangelog();
    const html = parseMarkdown(changelog);

    return (
        <section className="mx-auto max-w-3xl px-6 py-16">
            <h1 className="mb-2 text-4xl font-extrabold tracking-tight">Changelog</h1>
            <p className="mb-10 text-gray-500 dark:text-gray-400">
                All notable changes to DB Assistant are documented here.
            </p>
            <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </section>
    );
}
