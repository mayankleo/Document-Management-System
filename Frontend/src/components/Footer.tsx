export default function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className="mt-auto bg-white border-t text-xs text-gray-500">
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <p>&copy; {year} Document Management System <span>V0.1.0</span></p>
                <div className="flex gap-4 flex-col items-center">
                    <span>Made by Mayank Kushwaha</span>
                    <div className="flex gap-4">
                        <a className="text-green-500 hover:underline" href="https://github.com/mayankleo" target="_blank" rel="noopener noreferrer">GitHub</a>
                        <a className="text-green-500 hover:underline" href="mailto:mayankkushwaha226@gmail.com" target="_blank" rel="noopener noreferrer">Email</a>
                        <a className="text-green-500 hover:underline" href="https://www.linkedin.com/in/mayankleo" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
