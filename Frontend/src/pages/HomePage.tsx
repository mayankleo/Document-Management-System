import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export default function HomePage() {
  const user = useSelector((s: RootState) => s.auth.user);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Document Management System</h1>
            <p className="text-gray-600 mt-1">Welcome{user?.username ? `, ${user.username}` : ''}! Use the shortcuts below to get started.</p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <ShortcutCard
            title="My Documents"
            description="Find, preview and download documents with powerful filters."
            to="/documents"
            color="indigo"
          />
          {user?.isAdmin && (
            <ShortcutCard
              title="Upload Documents"
              description="Add new documents with heads, tags and remarks."
              to="/upload"
              color="emerald"
            />
          )}
          {user?.isAdmin && (
            <ShortcutCard
              title="Create User"
              description="Provision a new user (admin only)."
              to="/admin"
              color="amber"
            />
          )}
          <ShortcutCard
            title="Profile & Session"
            description="View your current role and manage your session."
            to="/profile"
            color="slate"
          />
        </div>

        <section className="mt-10 bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Features</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>Use the Document page to search and download relevant documents with powerful filters.</li>
            <li>Bulk select documents in Search to download a ZIP archive.</li>
            <li>Uploading supports all file but preview supported only for PDF and common image formats; add tags for easier discovery.</li>
            <li>Only admin can create admin users and upload documents.</li>
            <li>Admin can preview and download all uploaded documents.</li>
            <li>Normal user can preview and download relevant documents Uploaded by admin.</li>
            <li>Clean, simple, professional, user friendly and responsive interface.</li>
            <li>Profile page allows users to view their account information.</li>
            <li>Easy login and registration process with Mobile Number.</li>
            <li>Strong authentication and authorization Route mechanisms in place.</li>
          </ul>
          <h2 className="text-lg font-semibold my-3 text-gray-800">Tech Stack</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>
              Frontend:
              <ul className="list-disc list-inside ml-5">
                <li>React</li>
                <li>TypeScript</li>
                <li>Tailwind CSS</li>
                <li>Libraries:
                  <ul className="list-disc list-inside ml-5">
                    <li>Axios</li>
                    <li>React Router</li>
                    <li>Redux Toolkit</li>
                  </ul>
                </li>
              </ul>
            </li>
            <li>
              Backend:
              <ul className="list-disc list-inside ml-5">
                <li>.NET Core</li>
              </ul>
            </li>
            <li>
              Database:
              <ul className="list-disc list-inside ml-5">
                <li>MySQL</li>
              </ul>
            </li>
            <li>
              Authentication:
              <ul className="list-disc list-inside ml-5">
                <li>JSON Web Tokens (JWT)</li>
                <li>bcrypt</li>
              </ul>
            </li>
            <li>
              Version Control:
              <ul className="list-disc list-inside ml-5">
                <li>Git</li>
                <li>GitHub</li>
              </ul>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

interface ShortcutProps {
  title: string;
  description: string;
  to: string;
  color: string; // tailwind color name base
  disabled?: boolean;
}

function ShortcutCard({ title, description, to, color, disabled }: ShortcutProps) {
  const base = `border-${color}-300 bg-${color}-50 hover:bg-${color}-100 hover:border-${color}-400`;
  const disabledClasses = 'opacity-60 cursor-not-allowed';
  const content = (
    <div className={`h-full border rounded-lg p-5 transition shadow-sm ${disabled ? disabledClasses : base}`}>
      <h3 className="text-lg font-semibold mb-1 text-gray-800">{title}</h3>
      <p className="text-sm text-gray-600 leading-snug">{description}</p>
      {!disabled && <span className="inline-block mt-3 text-xs font-medium text-gray-700 underline">Open →</span>}
      {disabled && <span className="inline-block mt-3 text-xs font-medium text-gray-500">Coming soon</span>}
    </div>
  );
  if (disabled || to === '#') return content;
  return (
    <Link to={to} className="block focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 rounded-lg">
      {content}
    </Link>
  );
}
