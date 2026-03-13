import Link from "next/link";

const features = [
  {
    title: "Multi-Database Support",
    description:
      "Connect to PostgreSQL, MySQL, MariaDB, SQLite, SQL Server, MongoDB, and Redis — all from one app.",
    icon: (
      <svg
        className="h-8 w-8 text-blue-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
        />
      </svg>
    ),
  },
  {
    title: "Tabbed Interface",
    description:
      "Work with multiple databases, tables, and queries simultaneously in a tabbed workspace.",
    icon: (
      <svg
        className="h-8 w-8 text-blue-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
        />
      </svg>
    ),
  },
  {
    title: "SQL Editor",
    description:
      "Write and execute queries with syntax highlighting, autocomplete, and query history.",
    icon: (
      <svg
        className="h-8 w-8 text-blue-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
        />
      </svg>
    ),
  },
  {
    title: "Quick CRUD",
    description:
      "Create, read, update, and delete records with keyboard shortcuts and right-click context menus.",
    icon: (
      <svg
        className="h-8 w-8 text-blue-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
        />
      </svg>
    ),
  },
  {
    title: "Cross-Platform",
    description:
      "Runs natively on Windows, Linux, and macOS. Same experience everywhere.",
    icon: (
      <svg
        className="h-8 w-8 text-blue-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
        />
      </svg>
    ),
  },
  {
    title: "Secure by Default",
    description:
      "Credentials encrypted at rest. Parameterized queries only. Your data stays safe.",
    icon: (
      <svg
        className="h-8 w-8 text-blue-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
  },
];

const databases = [
  {
    name: "PostgreSQL",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  {
    name: "MySQL",
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  {
    name: "MariaDB",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
  {
    name: "SQLite",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  {
    name: "SQL Server",
    color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  {
    name: "MongoDB",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  {
    name: "Redis",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950" />
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center lg:pt-32">
          <div className="mb-6 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
            v0.1.1-beta.0 — Beta
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            The database manager{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              you&apos;ve been waiting for
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            Connect to PostgreSQL, MySQL, SQLite, MongoDB, Redis, and more.
            Browse schemas, run queries, and manage data — all from one
            beautiful, cross-platform app.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/download"
              className="rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
            >
              Download for Free
            </Link>
            <Link
              href="https://github.com/dsbroomeco/app-db-assistant"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-300 bg-white px-8 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              View on GitHub
            </Link>
          </div>

          {/* Supported databases pills */}
          <div className="mt-14">
            <p className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-400">
              Supports your favorite databases
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {databases.map((db) => (
                <span
                  key={db.name}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${db.color}`}
                >
                  {db.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* App Screenshot Placeholder */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-gray-500">DB Assistant</span>
          </div>
          <div className="flex min-h-[320px] lg:min-h-[420px]">
            {/* Sidebar */}
            <div className="hidden w-56 border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 sm:block">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Connections
              </p>
              <div className="space-y-2">
                {["Production PG", "Local MySQL", "Dev MongoDB"].map(
                  (name) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900"
                    >
                      <span className="h-2 w-2 rounded-full bg-green-400" />
                      {name}
                    </div>
                  ),
                )}
              </div>
            </div>
            {/* Main area */}
            <div className="flex flex-1 flex-col">
              <div className="flex border-b border-gray-200 dark:border-gray-800">
                <div className="border-b-2 border-blue-500 px-4 py-2 text-sm font-medium">
                  users
                </div>
                <div className="px-4 py-2 text-sm text-gray-400">orders</div>
                <div className="px-4 py-2 text-sm text-gray-400">Query 1</div>
              </div>
              <div className="flex-1 p-6">
                <div className="mb-4 rounded-lg bg-gray-50 p-3 font-mono text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-400">
                  SELECT * FROM users WHERE active = true ORDER BY created_at
                  DESC LIMIT 25;
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs uppercase text-gray-400 dark:border-gray-800">
                        <th className="px-3 py-2">id</th>
                        <th className="px-3 py-2">name</th>
                        <th className="px-3 py-2">email</th>
                        <th className="px-3 py-2">active</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600 dark:text-gray-400">
                      {[
                        {
                          id: 1,
                          name: "Alice Johnson",
                          email: "alice@example.com",
                        },
                        {
                          id: 2,
                          name: "Bob Smith",
                          email: "bob@example.com",
                        },
                        {
                          id: 3,
                          name: "Carol Davis",
                          email: "carol@example.com",
                        },
                      ].map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-gray-100 last:border-0 dark:border-gray-800/50"
                        >
                          <td className="px-3 py-2">{row.id}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2">{row.email}</td>
                          <td className="px-3 py-2">
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300">
                              true
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-20 dark:bg-gray-900/50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Everything you need to manage your databases
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
              Built for developers who want power and simplicity.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to simplify your database workflow?
          </h2>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            Download DB Assistant for free and start managing your databases
            like a pro.
          </p>
          <div className="mt-8">
            <Link
              href="/download"
              className="inline-block rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
            >
              Download for Free
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
