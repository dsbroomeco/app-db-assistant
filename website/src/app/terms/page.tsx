import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Use — DB Assistant",
    description: "Terms of use for DB Assistant.",
};

export default function TermsPage() {
    return (
        <section className="mx-auto max-w-3xl px-6 py-16">
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight">Terms of Use</h1>
            <div className="space-y-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
                <p>
                    DB Assistant is provided under the MIT License. By using or contributing to the
                    project, you agree to the terms of that license.
                </p>
                <p>
                    You are responsible for your own data, database access, backups, and security posture
                    when using this software.
                </p>
                <p>
                    The software is provided &quot;as is&quot;, without warranty of any kind, express or implied,
                    including but not limited to merchantability, fitness for a particular purpose, and
                    noninfringement.
                </p>
                <p>
                    In no event shall the authors or copyright holders be liable for any claim, damages, or
                    other liability arising from use of the software.
                </p>
            </div>
        </section>
    );
}
