"""
Regenerates the game's two word lists.

Why two lists: a single list has to be permissive enough to accept whatever a
player types, which forces it to contain obscure words — and those then get
picked as answers. Splitting the two roles lets each be tuned independently.

    allowed.json   every word accepted as a *guess*. Big and permissive;
                   obscurity is fine here, since a bigger list just means
                   fewer real words wrongly rejected.

    answers.json   the only words that can be the secret word. Small and
                   conservative: common, singular, not a proper noun.

Run:  pip install wordfreq simplemma spacy && python -m spacy download es_core_news_sm
      python apps/worker/scripts/build_wordlists.py
"""

import json
import re
import pathlib
import unicodedata

import spacy
import simplemma
from wordfreq import top_n_list, zipf_frequency

LIB = pathlib.Path(__file__).resolve().parent.parent / "src" / "lib"
WORD_LENGTH = 5

# Answers must clear this. Tuned so the list lands around 4 years of daily
# words *after* the other filters, which cut far more than frequency alone.
ANSWER_MIN_ZIPF = 2.8
# Guesses only need to be plausibly real, so this bar is much lower.
ALLOWED_MIN_ZIPF = 2.5

# Excluded from answers only — still perfectly valid guesses. Nobody wants to
# open a family word game and find a slur is today's puzzle.
ANSWER_BLOCKLIST = {
    "puta", "putas", "puto", "putos", "zorra", "perra", "coño", "joder",
    "mierd", "culos", "tetas", "polla", "pinga", "verga", "pendejo",
    "negro", "negra", "gitan", "maric", "trava", "sudac", "moros",
    "matar", "mator", "droga", "porno", "sexos", "viola",
}

# Proper nouns that survive every automated filter: common enough, they
# lemmatise to themselves, they appear in Spanish word lists, and spaCy tags
# them as ordinary nouns when seen in isolation. Found by reading the
# generated list. Nationalities (belga, checo, sueco, vasco...) are kept
# deliberately — they are ordinary lowercase adjectives in Spanish.
NAME_BLOCKLIST = {
    # people
    "bambi", "bauza", "berta", "bruno", "celia", "césar", "dante", "diego",
    "ester", "guido", "hayes", "henry", "juana", "judas", "leila", "llosa",
    "luisa", "marta", "mauro", "mejía", "mirza", "mitre", "nacho", "paine",
    "petra", "romeo", "rosen", "salma", "serna", "simón", "tirso", "tulio",
    "diana", "satán", "sabra",
    # places
    "argel", "aruba", "chaco", "chili", "congo", "creta", "cuzco", "elche",
    "fargo", "gabón", "gante", "ghana", "hades", "judea", "jujuy", "maule",
    "milán", "nepal", "níger", "palau", "papúa", "qatar", "rioja", "samoa",
    "sudán", "tampa", "yemen", "belén", "greco",
    # planets, signs, brands
    "marte", "venus", "aries", "tauro", "tesla", "volvo", "boxer", "amber",
    "roman",
}

# Corpus artefacts and foreign words. The frequency corpus is scraped text,
# so it contains misspellings of accented forms (nacio, salio, veria),
# clitic-attached verbs (darlo, denme), voseo forms (hacés), truncations,
# and untranslated English. None of these should ever be an answer.
JUNK_BLOCKLIST = {
    # unaccented misspellings of verb forms
    "diran", "diras", "nacio", "salio", "veria", "volvi", "pario", "nomas",
    # clitics and voseo
    "darlo", "denme", "dense", "hacés", "creés", "quier",
    # English / French / Latin left untranslated
    "table", "queen", "green", "cross", "corps", "rouge", "party", "force",
    "ocean", "blues", "ferry", "modus", "ferro", "jeans",
    # vulgar or anatomical — poor fits for a family word game
    "folla", "ojete", "ostia", "vulva", "semen", "pezón",
}

WORD_RE = re.compile(r"[a-záéíóúüñ]{%d}" % WORD_LENGTH)

# Native Spanish words end in a vowel or one of these consonants. Anything
# else is a loanword (saint, debut, tweet, robot) — fine to guess, but it
# makes an unsatisfying answer.
SPANISH_FINALS = set("aeiouáéíóúnrsldzy")


def is_wordish(w: str) -> bool:
    """Exactly WORD_LENGTH Spanish letters, no digits/punctuation/spaces."""
    return len(w) == WORD_LENGTH and WORD_RE.fullmatch(w) is not None


def normalized(w: str) -> str:
    """Accents stripped but ñ preserved — matches the game's own
    normalisation, so two spellings that play identically collapse to one."""
    protected = w.replace("ñ", "\0")
    stripped = "".join(
        c for c in unicodedata.normalize("NFD", protected)
        if not unicodedata.combining(c)
    )
    return stripped.replace("\0", "ñ")


def main() -> None:
    nlp = spacy.load("es_core_news_sm")

    legacy = {
        w for w in json.loads((LIB / "dictionary.json").read_text("utf-8")) if is_wordish(w)
    }
    corpus = [w for w in top_n_list("es", 200_000) if is_wordish(w)]

    # --- allowed (guessable) -------------------------------------------------
    # Union of the curated Spanish word list and anything reasonably attested
    # in the corpus. This is what fixes "normal words are missing".
    allowed = legacy | {w for w in corpus if zipf_frequency(w, "es") >= ALLOWED_MIN_ZIPF}

    # --- answers -------------------------------------------------------------
    answers = []
    seen_normalized = set()
    for w in corpus:
        if zipf_frequency(w, "es") < ANSWER_MIN_ZIPF:
            continue
        # k and w barely occur in native Spanish; their presence signals a
        # loanword or a transliterated name (tokyo, click, kayak).
        if "k" in w or "w" in w:
            continue
        if w[-1] not in SPANISH_FINALS:
            continue
        # "epoca" and "época" are the same puzzle once accents are stripped,
        # so keep only the first spelling seen (the corpus is frequency
        # ordered, so that is the more common one).
        norm = normalized(w)
        if norm in seen_normalized:
            continue
        # Conjugated verbs and plurals lemmatise to something else. Dropping
        # them leaves base forms, which make cleaner puzzles.
        if simplemma.lemmatize(w, lang="es") != w:
            continue
        # Present in a real Spanish word list — this is what removes most
        # proper nouns (david, texas, ariel), which the corpus happily
        # contains because it is lowercased.
        if w not in legacy:
            continue
        # Catches the proper nouns that *are* in the word list (rusia, pedro).
        if nlp(w)[0].pos_ == "PROPN":
            continue
        if w in ANSWER_BLOCKLIST or w in NAME_BLOCKLIST or w in JUNK_BLOCKLIST:
            continue
        seen_normalized.add(norm)
        answers.append(w)

    answers = sorted(set(answers))
    allowed = sorted(allowed | set(answers))

    (LIB / "answers.json").write_text(
        json.dumps(answers, ensure_ascii=False, indent=0), encoding="utf-8"
    )
    (LIB / "allowed.json").write_text(
        json.dumps(allowed, ensure_ascii=False, indent=0), encoding="utf-8"
    )

    print(f"answers.json  {len(answers):6d} words  (~{len(answers)/365:.1f} years)")
    print(f"allowed.json  {len(allowed):6d} words")


if __name__ == "__main__":
    main()
