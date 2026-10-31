import { query, mutation, type QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// Limits match what the app allows: up to 5 teams and 20 rounds
const MAX_NAME_LENGTH = 40;
const MAX_MEMBERS = 20;
const MAX_TEAMS = 5;
const MAX_ROUNDS = 20;
// Generous upper bound on points one team can score in a game (20 rounds of 30 seconds)
const MAX_SCORE = 1000;

// Every team and game belongs to one owner: a signed-in user, or the anonymous
// device ID the app generates and keeps on the phone. Two players can both have
// a "Team 1" without seeing or changing each other's data.
async function getOwnerId(ctx: QueryCtx, deviceId: string): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) return identity.tokenIdentifier;
  if (!/^[A-Za-z0-9-]{8,64}$/.test(deviceId)) {
    throw new ConvexError("Invalid device ID");
  }
  return `device:${deviceId}`;
}

function cleanName(name: string, label: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) {
    throw new ConvexError(`${label} must be 1-${MAX_NAME_LENGTH} characters`);
  }
  return trimmed;
}

function cleanMembers(members: string[]): string[] {
  if (members.length > MAX_MEMBERS) {
    throw new ConvexError(`A team can have at most ${MAX_MEMBERS} players`);
  }
  return members.map((m) => cleanName(m, "Player name"));
}

function checkScore(score: number) {
  if (!Number.isInteger(score) || Math.abs(score) > MAX_SCORE) {
    throw new ConvexError("Invalid score");
  }
}

async function findTeam(ctx: QueryCtx, ownerId: string, name: string) {
  return await ctx.db
    .query("teams")
    .withIndex("by_created_by_and_name", (q) => q.eq("createdBy", ownerId).eq("name", name))
    .first();
}

// Get the current player's teams
export const getUserTeams = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await getOwnerId(ctx, args.deviceId);
    return await ctx.db
      .query("teams")
      .withIndex("by_created_by_and_name", (q) => q.eq("createdBy", ownerId))
      .take(100);
  },
});

// Create or update one of the current player's teams
export const saveTeam = mutation({
  args: {
    deviceId: v.string(),
    name: v.string(),
    members: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerId = await getOwnerId(ctx, args.deviceId);
    const name = cleanName(args.name, "Team name");
    const members = cleanMembers(args.members);

    const existingTeam = await findTeam(ctx, ownerId, name);
    if (existingTeam) {
      await ctx.db.patch(existingTeam._id, { members });
      return existingTeam._id;
    }
    return await ctx.db.insert("teams", {
      name,
      members,
      createdBy: ownerId,
      gamesPlayed: 0,
      totalScore: 0,
      highestScore: 0,
      createdAt: Date.now(),
    });
  },
});

// Record game results and update the current player's team stats
export const recordGameResult = mutation({
  args: {
    deviceId: v.string(),
    teamScores: v.array(v.object({
      teamName: v.string(),
      teamMembers: v.array(v.string()),
      score: v.number(),
    })),
    totalRounds: v.number(),
    winningTeam: v.string(),
  },
  handler: async (ctx, args) => {
    const ownerId = await getOwnerId(ctx, args.deviceId);
    if (args.teamScores.length < 2 || args.teamScores.length > MAX_TEAMS) {
      throw new ConvexError(`A game has 2-${MAX_TEAMS} teams`);
    }
    if (!Number.isInteger(args.totalRounds) || args.totalRounds < 1 || args.totalRounds > MAX_ROUNDS) {
      throw new ConvexError("Invalid number of rounds");
    }
    const teamScores = args.teamScores.map((t) => {
      checkScore(t.score);
      return {
        teamName: cleanName(t.teamName, "Team name"),
        teamMembers: cleanMembers(t.teamMembers),
        score: t.score,
      };
    });
    // A tie lists every winner, e.g. "Lions & Eagles"
    if (args.winningTeam.length > (MAX_NAME_LENGTH + 3) * MAX_TEAMS) {
      throw new ConvexError("Invalid winning team");
    }

    await ctx.db.insert("gameResults", {
      teamScores,
      totalRounds: args.totalRounds,
      gameDate: Date.now(),
      winningTeam: args.winningTeam,
      playedBy: ownerId,
    });

    for (const teamResult of teamScores) {
      const existingTeam = await findTeam(ctx, ownerId, teamResult.teamName);
      if (existingTeam) {
        await ctx.db.patch(existingTeam._id, {
          gamesPlayed: existingTeam.gamesPlayed + 1,
          totalScore: existingTeam.totalScore + teamResult.score,
          highestScore: Math.max(existingTeam.highestScore, teamResult.score),
          members: teamResult.teamMembers, // Update members in case they changed
        });
      } else {
        // Quick Start games never call saveTeam, so create the team here
        await ctx.db.insert("teams", {
          name: teamResult.teamName,
          members: teamResult.teamMembers,
          createdBy: ownerId,
          gamesPlayed: 1,
          totalScore: teamResult.score,
          highestScore: Math.max(0, teamResult.score),
          createdAt: Date.now(),
        });
      }
    }
  },
});

// Get statistics for one of the current player's teams
export const getTeamStats = query({
  args: { deviceId: v.string(), teamName: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await getOwnerId(ctx, args.deviceId);
    const team = await findTeam(ctx, ownerId, args.teamName);
    if (!team) return null;

    // Look through this player's recent games for the ones this team played in
    const recentGames = await ctx.db
      .query("gameResults")
      .withIndex("by_played_by", (q) => q.eq("playedBy", ownerId))
      .order("desc")
      .take(50);
    const teamGames = recentGames
      .filter((game) => game.teamScores.some((s) => s.teamName === args.teamName))
      .slice(0, 5);

    return {
      ...team,
      averageScore: team.gamesPlayed > 0 ? team.totalScore / team.gamesPlayed : 0,
      recentGames: teamGames,
    };
  },
});
