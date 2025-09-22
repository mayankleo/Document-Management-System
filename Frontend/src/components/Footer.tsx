export default function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className="mt-auto bg-white/90 backdrop-blur border-t text-[11px] text-gray-500">
            <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <p className="leading-tight">&copy; {year} <span className="font-medium text-gray-700">Document Management System</span> <span className="text-gray-400">v0.1.0</span></p>
                    <div className="flex flex-col items-start sm:items-end gap-2">
                        <span className="text-gray-600">Crafted by <span className="font-medium text-gray-700">Mayank Kushwaha</span></span>
                        <nav aria-label="Social links" className="flex flex-wrap gap-3">
                            <FooterLink href="https://github.com/mayankleo" label="GitHub" />
                            <FooterLink href="mailto:mayankkushwaha226@gmail.com" label="Email" />
                            <FooterLink href="https://www.linkedin.com/in/mayankleo" label="LinkedIn" />
                        </nav>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 text-[10px] text-gray-400">
                    <span>Built with React & Tailwind.</span>
                </div>
            </div>
        </footer>
    );
}

function FooterLink({ href, label }: { href: string; label: string }) {
    return (
        <a
            className="text-green-600 hover:text-green-700 hover:underline transition-colors"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
        >{label}</a>
    );
}
