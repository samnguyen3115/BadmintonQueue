import CourtCard from "./CourtCard.tsx";

export default function CourtView() {
    return (
        <div className="court-area p-4">
            <div className="entrance-label text-center mb-4 font-semibold">Entrance</div>
            <div className="courts-grid grid grid-cols-2 sm:grid-cols-4 gap-4">
                <CourtCard name="G1 (Game)" isGame id="G1" />
                <CourtCard name="W1 (Warm up)" id="W1" />
                <CourtCard name="W2 (Warm up)" id="W2" />
                <CourtCard name="G2 (Game)" isGame id="G2" />
                <CourtCard name="G3 (Game)" isGame id="G3" />
                <CourtCard name="W3 (Warm up)" id="W3" />
                <CourtCard name="W4 (Warm up)" id="W4" />
                <CourtCard name="G4 (Game)" isGame id="G4" />
            </div>
        </div>
    );
}
