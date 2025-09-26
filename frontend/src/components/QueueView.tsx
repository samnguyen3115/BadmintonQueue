type QueueViewProps = {
    title: string;
};

export default function QueueView({ title }: QueueViewProps) {
    return (
        <div className="queue-section p-4 border rounded-lg bg-white">
            <div className="queue-header mb-2">
                <h3 className="font-bold">{title}</h3>
                <div className="queue-info text-sm text-gray-500">Drag players here</div>
            </div>
            <div className="queue-content h-64 overflow-y-auto">
                {/* players will be mapped here */}
            </div>
        </div>
    );
}
