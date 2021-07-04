/*
Redis caching.
*/

import { problemsRedis } from "./redisClients";

import { Problem } from "../../common/interfaces/data";

const PROBLEM_TTL = 7 * 24 * 60 * 60; // one week

// const isValidProblemId = (id: string) => {
//   return /^[1-9][0-9]{3,}$/.test(id);
// };

export const getProblem = async (id: string): Promise<Problem | null> => {
  if (!(await problemsRedis.exists(id))) {
    return null;
  }
  const p: unknown = await problemsRedis.hgetall(id);
  return p as Problem;
};

export const cacheProblem = async (p: Problem): Promise<void> => {
  console.log("caching problem", p.id);
  const key = p.id;
  await problemsRedis
    .multi()
    .hset(key, p) // p is an object
    .expire(key, PROBLEM_TTL)
    .exec();
};