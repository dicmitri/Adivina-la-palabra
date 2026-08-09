// The word counts and thresholds quoted here come from
// apps/worker/scripts/build_wordlists.py and the lists it generates. If the
// lists are regenerated with different settings, update this page too.
const ANSWERS_COUNT = 1213;
const ALLOWED_COUNT = 8952;

function ExampleRow({ word, statuses }) {
  const colors = {
    correct: "bg-green-500 border-green-500 text-white",
    present: "bg-yellow-500 border-yellow-500 text-white",
    absent: "bg-gray-500 border-gray-500 text-white",
    empty: "border-gray-300 bg-white text-black",
  };
  return (
    <div className="flex gap-1 my-2">
      {word.split("").map((c, i) => (
        <div
          key={i}
          className={`w-8 h-8 border-2 rounded flex items-center justify-center text-sm font-bold ${colors[statuses[i]]}`}
        >
          {c}
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="font-bold text-lg text-gray-800 mb-2">{title}</h2>
      <div className="text-sm text-gray-700 space-y-2">{children}</div>
    </section>
  );
}

export default function Help({ onClose, backLabel = "Volver al juego" }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Cómo funciona</h1>
        <button onClick={onClose} className="text-sm underline text-gray-600">
          {backLabel}
        </button>
      </div>

      <Section title="El juego">
        <p>
          Cada día hay una palabra secreta de <strong>5 letras</strong> y tienes{" "}
          <strong>6 intentos</strong> para acertarla. Cada liga tiene su propia palabra, así que
          no coincide con la de tus otras ligas.
        </p>
        <p>
          Después de cada intento, cada casilla te dice algo. Si la palabra secreta fuera{" "}
          <strong>CARTA</strong> y probaras <strong>RATON</strong>:
        </p>
        {/* Colours verified against the real checkGuess: R and T are in CARTA
            but in other positions, the A in second place is exact. */}
        <ExampleRow word="RATON" statuses={["present", "correct", "present", "absent", "absent"]} />
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <span className="font-semibold text-green-700">Verde</span>: la letra está en la
            palabra y en esa posición.
          </li>
          <li>
            <span className="font-semibold text-yellow-700">Amarillo</span>: la letra está en la
            palabra, pero en otra posición.
          </li>
          <li>
            <span className="font-semibold text-gray-600">Gris</span>: la letra no está en la
            palabra.
          </li>
        </ul>
      </Section>

      <Section title="Tildes y la Ñ">
        <p>
          No hace falta escribir tildes: <strong>ÉPOCA</strong> se escribe <strong>EPOCA</strong>.
          La <strong>Ñ</strong> sí cuenta como letra propia, así que <strong>PEÑA</strong> y{" "}
          <strong>PENA</strong> son palabras distintas.
        </p>
      </Section>

      <Section title="Puntos">
        <p>Cuantos menos intentos necesites, más puntos ganas:</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 my-2">
          {[
            ["1º", 20],
            ["2º", 15],
            ["3º", 10],
            ["4º", 7],
            ["5º", 5],
            ["6º", 2],
          ].map(([label, pts]) => (
            <div key={label} className="border rounded p-2 text-center">
              <div className="text-xs text-gray-500">{label} intento</div>
              <div className="font-bold">{pts}</div>
            </div>
          ))}
        </div>
        <p>Si no aciertas en 6 intentos, ese día no puntúas.</p>
      </Section>

      <Section title="Ligas y rondas">
        <p>
          Puedes crear una liga o unirte a otra con su código de invitación. Al crearla eliges cada
          cuánto se reinicia la clasificación: <strong>diaria</strong>, <strong>semanal</strong> o{" "}
          <strong>trimestral</strong>.
        </p>
        <p>
          La pestaña <strong>Hoy</strong> muestra los resultados del día. La pestaña{" "}
          <strong>General</strong> muestra los puntos acumulados de la ronda en curso. Quien acaba
          la ronda en primer lugar gana un <strong>🏆 trofeo</strong>, y los trofeos se van
          acumulando. El nombre de quien ganó el día anterior aparece en dorado.
        </p>
      </Section>

      <Section title="El diccionario">
        <p>
          Hay <strong>dos listas de palabras</strong>, y esa separación es a propósito. Con una
          sola lista hay que elegir entre aceptar cualquier palabra real —lo que obliga a incluir
          palabras rarísimas, que luego salen como solución— o mantenerla limpia y rechazar
          palabras normales. Con dos listas, cada una hace bien su trabajo:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>{ALLOWED_COUNT.toLocaleString("es-ES")} palabras</strong> se aceptan como
            intento. Aquí ser generoso es bueno: cuantas más haya, menos veces se rechaza una
            palabra que existe de verdad.
          </li>
          <li>
            <strong>{ANSWERS_COUNT.toLocaleString("es-ES")} palabras</strong> pueden ser la
            solución (unos {(ANSWERS_COUNT / 365).toFixed(1)} años a una por día). Solo palabras
            que se usan de verdad.
          </li>
        </ul>
        <p>
          Cada liga recorre esas soluciones en un orden propio y mezclado, y no repite ninguna
          hasta haber pasado por todas.
        </p>
      </Section>

      <Section title="Cómo se eligieron las soluciones">
        <p>
          Partiendo de un corpus de frecuencia del español, una palabra solo puede ser solución si
          cumple todo esto:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Se usa lo suficiente.</strong> Por debajo de cierta frecuencia, las palabras
            dejan de ser conocidas.
          </li>
          <li>
            <strong>Está en su forma base.</strong> Fuera formas verbales conjugadas y plurales:
            sale <em>cantar</em>, no <em>canta</em>; <em>nube</em>, no <em>nubes</em>.
          </li>
          <li>
            <strong>No es un nombre propio.</strong> Nada de personas, ciudades, países, marcas ni
            planetas.
          </li>
          <li>
            <strong>Es una palabra española.</strong> Fuera extranjerismos sin traducir; también
            se descartan las que llevan k o w, o acaban en una letra en la que el español no
            acaba.
          </li>
          <li>
            <strong>No está repetida.</strong> Como las tildes no se escriben, <em>época</em> y{" "}
            <em>epoca</em> serían el mismo juego, así que solo queda una.
          </li>
          <li>
            <strong>No es ofensiva.</strong> Puedes escribirlas como intento, pero no aparecerán
            como solución del día.
          </li>
        </ul>
        <p className="pt-1">
          Aun así se cuela alguna cosa rara, y sobre todo faltan palabras normales. Si el juego te
          rechaza una palabra que existe, pulsa{" "}
          <strong>«¿Debería estarlo?»</strong> justo debajo del mensaje: la revisamos y, si
          procede, se añade.
        </p>
      </Section>
    </div>
  );
}
