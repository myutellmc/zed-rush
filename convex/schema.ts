import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  teams: defineTable({
    name: v.string(),
    members: v.array(v.string()),
    // Owner: signed-in user's tokenIdentifier, or "device:<id>" for anonymous players
    createdBy: v.optional(v.string()),
    gamesPlayed: v.number(),
    totalScore: v.number(),
    highestScore: v.number(),
    createdAt: v.number(),
  }).index("by_created_by_and_name", ["createdBy", "name"]),

  gameResults: defineTable({
    teamScores: v.array(v.object({
      teamName: v.string(),
      teamMembers: v.array(v.string()),
      score: v.number(),
    })),
    totalRounds: v.number(),
    gameDate: v.number(),
    winningTeam: v.string(),
    playedBy: v.optional(v.string()), // same owner key as teams.createdBy
  }).index("by_played_by", ["playedBy"]),
});