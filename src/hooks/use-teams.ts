import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getDeviceId } from "@/lib/device-id";

export function useUserTeams() {
  const teams = useQuery(api.teams.getUserTeams, { deviceId: getDeviceId() });

  return {
    teams,
    isLoading: teams === undefined,
  };
}

export function useSaveTeam() {
  return useMutation(api.teams.saveTeam);
}

export function useRecordGame() {
  return useMutation(api.teams.recordGameResult);
}

export function useTeamStats(teamName: string) {
  return useQuery(api.teams.getTeamStats, teamName ? { deviceId: getDeviceId(), teamName } : "skip");
}
