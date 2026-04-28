import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy — DB Assistant",
    description: "Privacy policy for DB Assistant website and desktop application.",
};

export default function PrivacyPage() {
    return (
        <section className="mx-auto max-w-3xl px-6 py-16">
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
            <div className="space-y-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
                <p>
                    DB Assistant is an open-source desktop application. We do not run a hosted backend
                    service for your database activity, and we do not collect or sell your query data.
                </p>
                <p>
                    Connection credentials are stored locally and encrypted at rest. You are responsible for
                    securing the machine where DB Assistant is installed.
                </p>
                <p>
                    The marketing website may be served via GitHub Pages and can use standard GitHub
                    infrastructure logging. Refer to GitHub&apos;s privacy policy for platform-level details.
                </p>
                <p>
                    For security disclosures, please contact the maintainers privately instead of opening a
                    public issue.
                </p>
            </div>
        </section>
    );
}
