import { createRouter } from "./router.js";
import { json, preflightResponse, HttpError } from "./lib/http.js";
import { requireUser } from "./lib/auth.js";
import { getMe, createProfile } from "./routes/me.js";
import {
  createLeague,
  joinLeague,
  listMyLeagues,
  updateLeague,
  deleteLeague,
  leaveLeague,
} from "./routes/leagues.js";
import { getToday, submitGuess } from "./routes/game.js";
import { getLeaderboard } from "./routes/leaderboard.js";
import { suggestWord } from "./routes/suggestions.js";
import {
  listSuggestions,
  decideSuggestion,
  listExtraWords,
  removeExtraWord,
  listAllLeagues,
  listLeagueMembers,
  setLeagueAdmin,
} from "./routes/admin.js";
import { processRoundWinners } from "./scheduled.js";

const router = createRouter();

router.get("/api/health", async () => json({ ok: true }));
router.get("/api/me", withAuth(getMe));
router.post("/api/me", withAuth(createProfile));

router.post("/api/leagues", withAuth(createLeague));
router.post("/api/leagues/join", withAuth(joinLeague));
router.get("/api/leagues/mine", withAuth(listMyLeagues));
router.patch("/api/leagues/:id", withAuth(updateLeague));
router.delete("/api/leagues/:id", withAuth(deleteLeague));
router.post("/api/leagues/:id/leave", withAuth(leaveLeague));

router.get("/api/leagues/:id/today", withAuth(getToday));
router.post("/api/leagues/:id/guess", withAuth(submitGuess));
router.get("/api/leagues/:id/leaderboard", withAuth(getLeaderboard));

router.post("/api/suggestions", withAuth(suggestWord));

router.get("/api/admin/suggestions", withAuth(listSuggestions));
router.post("/api/admin/suggestions/:word", withAuth(decideSuggestion));
router.get("/api/admin/words", withAuth(listExtraWords));
router.delete("/api/admin/words/:word", withAuth(removeExtraWord));
router.get("/api/admin/leagues", withAuth(listAllLeagues));
router.get("/api/admin/leagues/:id/members", withAuth(listLeagueMembers));
router.post("/api/admin/leagues/:id/admin", withAuth(setLeagueAdmin));

function withAuth(handler) {
  return async (request, env, ctx) => {
    const user = await requireUser(request, env);
    return handler(request, env, { ...ctx, user });
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return preflightResponse();

    const url = new URL(request.url);
    const matched = router.match(request.method, url.pathname);
    if (!matched) return json({ error: "No encontrado" }, { status: 404 });

    try {
      return await matched.handler(request, env, { params: matched.params });
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, { status: err.status });
      console.error(err);
      return json({ error: "Error del servidor, inténtalo de nuevo" }, { status: 500 });
    }
  },

  async scheduled(event, env) {
    await processRoundWinners(env);
  },
};
