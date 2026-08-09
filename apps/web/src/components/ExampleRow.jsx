// A static row of result tiles, used by the help page and the login screen.
// Shared so the two cannot drift apart in colour or shape.
const COLORS = {
  correct: "bg-green-500 border-green-500 text-white",
  present: "bg-yellow-500 border-yellow-500 text-white",
  absent: "bg-gray-500 border-gray-500 text-white",
  empty: "border-gray-300 bg-white text-black",
};

export default function ExampleRow({ word, statuses, className = "w-8 h-8 text-sm" }) {
  return (
    <div className="flex gap-1 justify-center">
      {word.split("").map((c, i) => (
        <div
          key={i}
          className={`border-2 rounded flex items-center justify-center font-bold ${className} ${COLORS[statuses[i]]}`}
        >
          {c}
        </div>
      ))}
    </div>
  );
}
