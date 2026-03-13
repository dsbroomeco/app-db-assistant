import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
            <div className="mx-auto max-w-6xl px-6 py-12">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Brand */}
                    <div>
                        <h3 className="text-lg font-bold">DB Assistant</h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            A powerful, free, cross-platform database manager for developers.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                            Product
                        </h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link
                                    href="/#features"
                                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                >
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/download"
                                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                >
                                    Download
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                            Resources
                        </h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link
                                    href="https://github.com/your-org/app-db-assistant"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                >
                                    GitHub
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="https://github.com/your-org/app-db-assistant/issues"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                >
                                    Report a Bug
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                            Legal
                        </h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link
                                    href="/privacy"
                                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                >
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/terms"
                                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                >
                                    Terms of Use
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-10 border-t border-gray-200 pt-6 text-center text-sm text-gray-400 dark:border-gray-800">
                    &copy; {new Date().getFullYear()} DB Assistant. MIT License.
                </div>
            </div>
        </footer>
    );
}
