export default function PartyView() {
    const team = ["Alice", "Bob", "Charlie"];

    return (
        <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Your Party</h2>
            <div className="flex gap-2">
                {team.map((member, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-500 text-white rounded-full">
            {member}
          </span>
                ))}
            </div>
        </div>
    );
}
