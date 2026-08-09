// Everything here is checked against what the code actually does. If the app
// starts collecting something new — analytics, cookies, ads, a new field in
// the database — this page has to change in the same commit.
//
// Set this to a real address so people can actually exercise the rights
// described below. While it is empty the page falls back to vaguer wording.
const CONTACT_EMAIL = "ristlincin@gmail.com";

function Section({ title, children }) {
  return (
    <section className="mb-7">
      <h2 className="font-bold text-base text-gray-800 mb-2">{title}</h2>
      <div className="text-sm text-gray-700 space-y-2">{children}</div>
    </section>
  );
}

export default function Privacy({ onClose }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Privacidad</h1>
        <button onClick={onClose} className="text-sm underline text-gray-600">
          Volver al juego
        </button>
      </div>

      <p className="text-sm text-gray-700 mb-6">
        Esto es un juego hecho por afición, no una empresa. Aquí tienes, en lenguaje claro, qué
        datos hay, dónde están y qué se hace con ellos.
      </p>

      <Section title="Lo más importante, resumido">
        <ul className="list-disc pl-5 space-y-1">
          <li>No hay publicidad, ni cookies de seguimiento, ni herramientas de analítica.</li>
          <li>No se vende ni se cede tu información a nadie.</li>
          <li>
            Tu correo y tu contraseña los gestiona Google, no nosotros:{" "}
            <strong>tu correo no se guarda en nuestra base de datos</strong> y la contraseña no la
            vemos nunca.
          </li>
          <li>Solo se guarda lo que hace falta para que el juego funcione.</li>
        </ul>
      </Section>

      <Section title="Qué guarda Google (inicio de sesión)">
        <p>
          Para poder entrar usamos <strong>Firebase Authentication</strong>, un servicio de Google.
          Ahí quedan guardados tu <strong>correo electrónico</strong> y tu{" "}
          <strong>contraseña</strong>, además de datos técnicos que Google registra por su cuenta,
          como la fecha de creación de la cuenta, el último inicio de sesión y tu dirección IP, que
          usa para evitar abusos.
        </p>
        <p>
          La contraseña la guarda Google cifrada. Ni nosotros ni nadie de este juego podemos verla.
          Cuando entras, tu navegador recibe un permiso temporal que se guarda en el propio
          navegador (no como cookie) para no tener que pedirte la contraseña en cada visita.
        </p>
      </Section>

      <Section title="Qué guardamos nosotros (base de datos del juego)">
        <p>
          Nuestra base de datos está en <strong>Cloudflare D1</strong>. Guarda, asociado a un
          identificador que nos da Google al iniciar sesión:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tu <strong>nombre de usuario</strong> y la fecha en que lo creaste.</li>
          <li>Las <strong>ligas</strong> a las que perteneces, y cuáles administras.</li>
          <li>
            Las <strong>palabras que pruebas cada día</strong>, si acertaste, en cuántos intentos y
            los puntos y trofeos que consigues.
          </li>
          <li>Las palabras que propones para el diccionario.</li>
        </ul>
        <p>
          <strong>No guardamos tu correo</strong> en esta base de datos. Cuando la aplicación habla
          con el servidor, tu correo viaja dentro del permiso que emite Google, pero no se
          almacena.
        </p>
      </Section>

      <Section title="Qué ve el resto de la gente">
        <p>
          Dentro de una liga, los demás miembros ven tu <strong>nombre de usuario</strong>, tus{" "}
          <strong>puntos</strong> y tus <strong>trofeos</strong>. No ven tu correo ni las palabras
          concretas que probaste.
        </p>
        <p>
          Si eliges un nombre de usuario que te identifique, esa es la información que estarás
          compartiendo. Puedes usar el nombre que quieras.
        </p>
        <p>
          Quien administra el juego puede ver, además, las palabras propuestas y quién las propuso,
          y el listado de ligas con su número de miembros.
        </p>
      </Section>

      <Section title="Dónde se aloja todo">
        <p>
          La web y el servidor funcionan en <strong>Cloudflare</strong> (Pages y Workers). Como
          cualquier alojamiento, Cloudflare procesa datos técnicos de las visitas —dirección IP,
          tipo de navegador, hora de la petición— para servir la página y protegerla de ataques.
          Nosotros no consultamos esos datos ni los usamos para nada.
        </p>
        <p>
          Tanto Google como Cloudflare son empresas estadounidenses y pueden tratar estos datos
          fuera de la Unión Europea, con las garantías previstas en sus propias políticas de
          privacidad.
        </p>
      </Section>

      <Section title="Publicidad">
        <p>
          Ahora mismo <strong>no hay ninguna publicidad</strong> y no se comparte información con
          anunciantes.
        </p>
        <p>
          Si algún día hiciera falta poner anuncios para pagar el alojamiento, la intención es
          evitar en lo posible la publicidad personalizada o basada en seguimiento. Si eso llegara
          a pasar, se avisará aquí antes.
        </p>
      </Section>

      <Section title="Cuánto tiempo se guarda y cómo borrarlo">
        <p>
          Los datos se conservan mientras tengas la cuenta. Puedes pedir que borremos tu cuenta y
          todo lo asociado a ella, y también pedir una copia de lo que hay guardado sobre ti o que
          se corrija algo.
        </p>
        <p>
          {CONTACT_EMAIL ? (
            <>
              Para cualquiera de esas cosas, escribe a{" "}
              <a className="text-blue-600 underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </>
          ) : (
            <>Para cualquiera de esas cosas, ponte en contacto con quien administra el juego.</>
          )}
        </p>
        <p>
          Ten en cuenta que si borras tu cuenta, tus resultados desaparecen también de las
          clasificaciones de tus ligas.
        </p>
      </Section>

      <Section title="Cambios">
        <p>
          Si en algún momento el juego empieza a recoger algo distinto de lo que dice esta página,
          esta página se actualizará al mismo tiempo.
        </p>
      </Section>
    </div>
  );
}
