"use client";

import Link from "next/link";
import { useState } from "react";

type PlatformName = "Windows" | "Linux" | "macOS";

interface Download {
    label: string;
    href: string;
    size: string;
}

interface Platform {
    name: PlatformName;
    downloads: Download[];
}

const platformIcons: Record<PlatformName, React.ReactNode> = {
    Windows: (
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
        </svg>
    ),
    Linux: (
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.496 1.648.135 2.26-.426.398-.364.676-.873.867-1.303h.262c.142.395.39.846.742 1.168.352.343.848.525 1.487.397.893-.178 1.326-.793 1.4-1.484.046-.427.014-.903-.052-1.379-.168-.278-.354-.513-.545-.79a3.16 3.16 0 00-.082-.127l-.286-.451h.002c.467-.87.89-2.693.89-2.72a.424.424 0 00.013-.078c.026-.252.26-.573.496-.98.246-.372.578-.768.592-1.47.017-.593-.184-1.456-.595-2.744a26.948 26.948 0 00-.66-1.908c-.34-.848-.707-1.572-.927-2.146-.222-.574-.312-.972-.232-1.313C15.199 1.718 14.467 0 12.504 0z" />
        </svg>
    ),
    macOS: (
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
    ),
};

function detectPlatform(): PlatformName | null {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent;
    if (ua.includes("Win")) return "Windows";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    return null;
}

export function DownloadCards({ platforms }: { platforms: Platform[] }) {
    const [detected] = useState<PlatformName | null>(() => detectPlatform());

    // Sort so the detected platform comes first
    const sorted = detected
        ? [...platforms].sort((a, b) => {
            if (a.name === detected) return -1;
            if (b.name === detected) return 1;
            return 0;
        })
        : platforms;

    return (
        <div className="grid gap-8 md:grid-cols-3">
            {sorted.map((platform) => {
                const isDetected = platform.name === detected;
                return (
                    <div
                        key={platform.name}
                        className={`flex flex-col rounded-xl border p-6 ${isDetected
                                ? "border-blue-400 bg-blue-50/50 ring-2 ring-blue-200 dark:border-blue-600 dark:bg-blue-950/20 dark:ring-blue-800"
                                : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                            }`}
                    >
                        <div className="mb-4 flex items-center gap-3">
                            <div className="text-gray-700 dark:text-gray-300">
                                {platformIcons[platform.name]}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{platform.name}</h2>
                                {isDetected && (
                                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                        Detected
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-1 flex-col gap-3">
                            {platform.downloads.map((dl) => (
                                <Link
                                    key={dl.label}
                                    href={dl.href}
                                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${isDetected
                                            ? "border-blue-200 hover:border-blue-400 hover:bg-blue-100 dark:border-blue-800 dark:hover:border-blue-600 dark:hover:bg-blue-950/50"
                                            : "border-gray-200 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
                                        }`}
                                >
                                    <span className="font-medium">{dl.label}</span>
                                    <span className="text-xs text-gray-400">{dl.size}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
