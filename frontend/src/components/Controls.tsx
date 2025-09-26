export default function Controls() {
    return (
        <div className="controls flex flex-wrap gap-2 p-4">
            <button className="btn btn-success bg-green-500 px-3 py-1 rounded">Add Advanced Player</button>
            <button className="btn btn-success bg-green-500 px-3 py-1 rounded">Add Intermediate Player</button>
            <button className="btn btn-danger bg-red-500 px-3 py-1 rounded">Delete Player</button>
            <button className="btn btn-warning bg-yellow-500 px-3 py-1 rounded">Manage Players</button>
            <button className="btn btn-info bg-blue-400 px-3 py-1 rounded">Auto Fill Courts</button>
            <button className="btn btn-sync bg-indigo-500 px-3 py-1 rounded">Sync with Database</button>
            <button className="btn btn-primary bg-blue-600 px-3 py-1 rounded">New Session</button>
        </div>
    );
}
