import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Download — DB Assistant",
    description:
        "Download DB Assistant for Windows, Linux, or macOS. Free and open source.",
};

const CURRENT_VERSION = "0.1.0";
const GITHUB_REPO = "dsbroomeco/app-db-assistant";
const RELEASE_BASE = `https://github.com/${GITHUB_REPO}/releases/download/v${CURRENT_VERSION}`;

const platforms = [
    {
        name: "Windows",
        icon: (
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
            </svg>
        ),
        downloads: [
            { label: "Installer (.exe)", href: `${RELEASE_BASE}/DB-Assistant-Setup-${CURRENT_VERSION}.exe`, size: "~85 MB" },
            { label: "MSI Package (.msi)", href: `${RELEASE_BASE}/DB-Assistant-${CURRENT_VERSION}.msi`, size: "~85 MB" },
        ],
    },
    {
        name: "Linux",
        icon: (
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.496 1.648.135 2.26-.426.398-.364.676-.873.867-1.303h.262c.142.395.39.846.742 1.168.352.343.848.525 1.487.397.893-.178 1.326-.793 1.4-1.484.046-.427.014-.903-.052-1.379-.168-.278-.354-.513-.545-.79a3.16 3.16 0 00-.082-.127l-.286-.451h.002c.467-.87.89-2.693.89-2.72a.424.424 0 00.013-.078c.026-.252.26-.573.496-.98.246-.372.578-.768.592-1.47.017-.593-.184-1.456-.595-2.744a26.948 26.948 0 00-.66-1.908c-.34-.848-.707-1.572-.927-2.146-.222-.574-.312-.972-.232-1.313C15.199 1.718 14.467 0 12.504 0z" />
            </svg>
        ),
        downloads: [
            { label: "AppImage", href: `${RELEASE_BASE}/DB-Assistant-${CURRENT_VERSION}.AppImage`, size: "~90 MB" },
            { label: "Debian (.deb)", href: `${RELEASE_BASE}/db-assistant_${CURRENT_VERSION}_amd64.deb`, size: "~88 MB" },
            { label: "RPM (.rpm)", href: `${RELEASE_BASE}/db-assistant-${CURRENT_VERSION}.x86_64.rpm`, size: "~88 MB" },
        ],
    },
    {
        name: "macOS",
        icon: (
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
        ),
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
                <div className="grid gap-8 md:grid-cols-3">
                    {platforms.map((platform) => (
                        <div
                            key={platform.name}
                            className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950"
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <div className="text-gray-700 dark:text-gray-300">
                                    {platform.icon}
                                </div>
                                <h2 className="text-xl font-bold">{platform.name}</h2>
                            </div>
                            <div className="flex flex-1 flex-col gap-3">
                                {platform.downloads.map((dl) => (
                                    <Link
                                        key={dl.label}
                                        href={dl.href}
                                        className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
                                    >
                                        <span className="font-medium">{dl.label}</span>
                                        <span className="text-xs text-gray-400">{dl.size}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

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
