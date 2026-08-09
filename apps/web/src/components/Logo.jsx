// The wordmark, built from game tiles.
//
// Colours cycle green → yellow → grey across the letters so the pattern looks
// deliberate and, being derived from position, stays identical on every
// render rather than flickering to a new arrangement.
//
// The full title is 16 tiles wide, which crowds a narrow bar, so anything
// below `lg` gets the three-letter version instead — one colour each.
const TILE_COLORS = ["bg-green-500", "bg-yellow-500", "bg-gray-500"];

const WORDS = ["ADIVINA", "LA", "PALABRA"];

function Tile({ char, colorIndex, className }) {
  return (
    <span
      aria-hidden="true"
      className={`${TILE_COLORS[colorIndex % TILE_COLORS.length]} text-white font-bold rounded-sm flex items-center justify-center ${className}`}
    >
      {char}
    </span>
  );
}

export default function Logo() {
  // Continuous across word boundaries, so the cycle is not restarted by the
  // spaces.
  let letterIndex = 0;

  return (
    <div aria-label="Adivina la Palabra" role="img" className="flex items-center">
      {/* Narrow bars: ALP */}
      <span className="flex lg:hidden gap-1">
        {["A", "L", "P"].map((char, i) => (
          <Tile key={char} char={char} colorIndex={i} className="w-6 h-6 text-xs" />
        ))}
      </span>

      {/* Wide bars: the whole title, with gaps between words */}
      <span className="hidden lg:flex items-center gap-2">
        {WORDS.map((word) => (
          <span key={word} className="flex gap-0.5">
            {word.split("").map((char, i) => (
              <Tile
                key={`${word}-${i}`}
                char={char}
                colorIndex={letterIndex++}
                className="w-5 h-5 text-[10px]"
              />
            ))}
          </span>
        ))}
      </span>
    </div>
  );
}
