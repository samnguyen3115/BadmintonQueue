type CourtCardProps = {
    name: string;
    isGame?: boolean;
    id: string;
};

export default function CourtCard({ name, isGame, id }: CourtCardProps) {
    return (
        <div className="court border rounded-lg p-3 bg-green-100" id={`${id}-court`}>
            <div className="court-header flex items-center justify-between">
                <div className="court-title flex items-center gap-2">
                    <span className="font-bold">{name}</span>
                    {isGame && (
                        <button
                            className="rotate-btn text-lg"
                            title="Finish game - rotate players"
                        >
                            🔄
                        </button>
                    )}
                </div>
                <select className="court-type-dropdown border p-1 rounded">
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="training">Training</option>
                </select>
            </div>
            <div className="court-players mt-2 text-sm text-gray-700">
                {/* players go here */}
            </div>
        </div>
    );
}
