"use client";

import Link from "next/link";
import { useState } from "react";

export function Header() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <Link href="/" className="flex items-center gap-2 text-xl font-bold">
                    <svg
                        width="28"
                        height="28"
                        viewBox="0 0 28 28"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                    >
                        <rect width="28" height="28" rx="6" fill="#3b82f6" />
                        <ellipse cx="14" cy="9" rx="8" ry="3.5" fill="#93c5fd" />
                        <ellipse
                            cx="14"
                            cy="14"
                            rx="8"
                            ry="3.5"
                            fill="#60a5fa"
                            fillOpacity="0.8"
                        />
                        <ellipse
                            cx="14"
                            cy="19"
                            rx="8"
                            ry="3.5"
                            fill="#3b82f6"
                            fillOpacity="0.9"
                        />
                    </svg>
                    <span>DB Assistant</span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden items-center gap-8 md:flex">
                    <Link
                        href="/#features"
                        className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                        Features
                    </Link>
                    <Link
                        href="/download"
                        className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                        Download
                    </Link>
                    <Link
                        href="https://github.com/your-org/app-db-assistant"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                        GitHub
                    </Link>
                    <Link
                        href="/download"
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        Download Free
                    </Link>
                </nav>

                {/* Mobile hamburger */}
                <button
                    className="md:hidden"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                >
                    <svg
                        width="24"
                        height="24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    >
                        {menuOpen ? (
                            <>
                                <line x1="6" y1="6" x2="18" y2="18" />
                                <line x1="6" y1="18" x2="18" y2="6" />
                            </>
                        ) : (
                            <>
                                <line x1="4" y1="6" x2="20" y2="6" />
                                <line x1="4" y1="12" x2="20" y2="12" />
                                <line x1="4" y1="18" x2="20" y2="18" />
                            </>
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <nav className="border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950 md:hidden">
                    <div className="flex flex-col gap-4">
                        <Link
                            href="/#features"
                            className="text-sm text-gray-600 dark:text-gray-400"
                            onClick={() => setMenuOpen(false)}
                        >
                            Features
                        </Link>
                        <Link
                            href="/download"
                            className="text-sm text-gray-600 dark:text-gray-400"
                            onClick={() => setMenuOpen(false)}
                        >
                            Download
                        </Link>
                        <Link
                            href="https://github.com/your-org/app-db-assistant"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gray-600 dark:text-gray-400"
                        >
                            GitHub
                        </Link>
                        <Link
                            href="/download"
                            className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
                            onClick={() => setMenuOpen(false)}
                        >
                            Download Free
                        </Link>
                    </div>
                </nav>
            )}
        </header>
    );
}
