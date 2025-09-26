import QueueView from "./QueueView";

export default function QueuesSection() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <QueueView title="Advanced Queue" />
            <QueueView title="Intermediate Queue" />
        </div>
    );
}
