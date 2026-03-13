import type { Metadata } from "next";
import Link from "next/link";
import { DownloadCards } from "@/components/DownloadCards";

export const metadata: Metadata = {
    title: "Download — DB Assistant",
    description:
        "Download DB Assistant for Windows, Linux, or macOS. Free and open source.",
};

const CURRENT_VERSION = "0.1.1-beta.0";
const GITHUB_REPO = "dsbroomeco/app-db-assistant";
const RELEASE_BASE = `https://github.com/${GITHUB_REPO}/releases/download/v${CURRENT_VERSION}`;

const platforms = [
    {
        name: "Windows" as const,
        downloads: [
            { label: "Installer (.exe)", href: `${RELEASE_BASE}/DB-Assistant-Setup-${CURRENT_VERSION}.exe`, size: "~89 MB" },
            { label: "MSI Package (.msi)", href: `${RELEASE_BASE}/DB-Assistant-${CURRENT_VERSION}.msi`, size: "~98 MB" },
        ],
    },
    {
        name: "Linux" as const,
        downloads: [
            { label: "AppImage", href: `${RELEASE_BASE}/DB-Assistant-${CURRENT_VERSION}.AppImage`, size: "~122 MB" },
            { label: "Debian (.deb)", href: `${RELEASE_BASE}/db-assistant_${CURRENT_VERSION}_amd64.deb`, size: "~80 MB" },
            { label: "RPM (.rpm)", href: `${RELEASE_BASE}/db-assistant-${CURRENT_VERSION}.x86_64.rpm`, size: "~80 MB" },
        ],
    },
    {
        name: "macOS" as const,
        downloads: [
            { label: "DMG (Universal)", href: `${RELEASE_BASE}/DB-Assistant-${CURRENT_VERSION}-universal.dmg`, size: "~95 MB" },
        ],
    },
];

export default function DownloadPage() {
    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950" />
                <div className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                        Download DB Assistant
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600 dark:text-gray-400">
                        Free, open source, and available for all major platforms.
                    </p>
                    <p className="mt-3 text-sm text-gray-400">
                        Current version:{" "}
                        <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                            v{CURRENT_VERSION}
                        </span>
                    </p>
                </div>
            </section>

            {/* Platform cards */}
            <section className="mx-auto max-w-5xl px-6 pb-20">
                <DownloadCards platforms={platforms} />

                {/* System requirements */}
                <div className="mt-16 rounded-xl border border-gray-200 bg-gray-50 p-8 dark:border-gray-800 dark:bg-gray-900/50">
                    <h3 className="mb-4 text-lg font-bold">System Requirements</h3>
                    <div className="grid gap-6 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-3">
                        <div>
                            <h4 className="mb-2 font-semibold text-gray-900 dark:text-gray-200">
                                Windows
                            </h4>
                            <ul className="list-inside list-disc space-y-1">
                                <li>Windows 10 or later</li>
                                <li>64-bit (x64)</li>
                                <li>4 GB RAM minimum</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="mb-2 font-semibold text-gray-900 dark:text-gray-200">
                                Linux
                            </h4>
                            <ul className="list-inside list-disc space-y-1">
                                <li>Ubuntu 20.04+, Fedora 36+, or equivalent</li>
                                <li>64-bit (x64)</li>
                                <li>4 GB RAM minimum</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="mb-2 font-semibold text-gray-900 dark:text-gray-200">
                                macOS
                            </h4>
                            <ul className="list-inside list-disc space-y-1">
                                <li>macOS 12 Monterey or later</li>
                                <li>Apple Silicon or Intel</li>
                                <li>4 GB RAM minimum</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Previous versions */}
                <div className="mt-8 flex flex-col items-center gap-2 text-sm text-gray-500">
                    <div>
                        <Link
                            href="/changelog"
                            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                            View changelog
                        </Link>
                        {" · "}
                        <Link
                            href={`https://github.com/${GITHUB_REPO}/releases`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                            All releases on GitHub
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}
