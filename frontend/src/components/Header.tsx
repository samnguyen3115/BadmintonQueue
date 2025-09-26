export default function Header() {
    return (
        <header className="app-header flex items-center justify-between bg-blue-600 text-white p-4">
            <h1 className="text-xl font-bold">WPI Badminton Queue</h1>
            <div className="user-info flex items-center gap-4">
                <span id="welcome-message">Welcome!</span>
                <button className="btn btn-logout bg-red-500 px-3 py-1 rounded">Logout</button>
            </div>
        </header>
    );
}
